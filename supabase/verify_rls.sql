-- ============================================
-- Verificación manual de RLS (plan.md, Tarea 2)
-- ============================================
-- Prerequisito: la migración aplicada y dos usuarios de prueba creados en
-- el dashboard (Authentication → Users → Add user).
--
-- Correr el script COMPLETO de una sola vez en el SQL editor. El resultado
-- final es una tabla de chequeos: todo bien si la columna `ok` es true en
-- todas las filas. El script limpia sus propios datos de prueba al final.
--
-- Usuario A: 0afb3a90-92e2-489c-8925-808d2755ff46
-- Usuario B: 454f4715-1d17-4e9d-959a-a85939ecb4dc

-- ---- Seed (como rol admin del editor, saltea RLS) ----

insert into vaults (owner_id, name) values
  ('0afb3a90-92e2-489c-8925-808d2755ff46', 'Vault de A'),
  ('454f4715-1d17-4e9d-959a-a85939ecb4dc', 'Vault de B');

create temp table seed_vaults as
  select id, name from vaults where name in ('Vault de A', 'Vault de B');

create temp table rls_check (orden int, chequeo text, esperado text, obtenido text, ok boolean);

grant select on seed_vaults to authenticated;
grant select, insert on rls_check to authenticated;

-- ---- Simular al usuario A ----

set role authenticated;
set request.jwt.claims to '{"sub": "0afb3a90-92e2-489c-8925-808d2755ff46", "role": "authenticated"}';

insert into rls_check
select 1, 'A ve solo su propio vault', '1 fila: Vault de A',
       count(*) || ' fila(s): ' || coalesce(string_agg(name, ', '), '(ninguna)'),
       count(*) = 1 and bool_and(name = 'Vault de A')
from vaults;

insert into rls_check
select 2, 'A no ve el vault de B ni por id directo', '0 filas',
       count(*) || ' fila(s)', count(*) = 0
from vaults where id = (select id from seed_vaults where name = 'Vault de B');

do $$
begin
  insert into vaults (owner_id, name)
  values ('454f4715-1d17-4e9d-959a-a85939ecb4dc', 'intruso');
  insert into rls_check values
    (3, 'A no puede crear un vault a nombre de B', 'bloqueado por RLS', 'EL INSERT PASÓ', false);
exception when insufficient_privilege then
  insert into rls_check values
    (3, 'A no puede crear un vault a nombre de B', 'bloqueado por RLS', 'bloqueado por RLS', true);
end $$;

do $$
begin
  insert into notes (vault_id, type, title)
  select id, 'lore', 'nota propia' from seed_vaults where name = 'Vault de A';
  insert into rls_check values
    (4, 'A puede crear una nota en su vault', 'insert OK', 'insert OK', true);
exception when insufficient_privilege then
  insert into rls_check values
    (4, 'A puede crear una nota en su vault', 'insert OK', 'bloqueado por RLS', false);
end $$;

do $$
begin
  insert into notes (vault_id, type, title)
  select id, 'lore', 'nota intrusa' from seed_vaults where name = 'Vault de B';
  insert into rls_check values
    (5, 'A no puede crear una nota en el vault de B', 'bloqueado por RLS', 'EL INSERT PASÓ', false);
exception when insufficient_privilege then
  insert into rls_check values
    (5, 'A no puede crear una nota en el vault de B', 'bloqueado por RLS', 'bloqueado por RLS', true);
end $$;

-- ---- Simular al usuario B ----

set request.jwt.claims to '{"sub": "454f4715-1d17-4e9d-959a-a85939ecb4dc", "role": "authenticated"}';

insert into rls_check
select 6, 'B ve solo su propio vault', '1 fila: Vault de B',
       count(*) || ' fila(s): ' || coalesce(string_agg(name, ', '), '(ninguna)'),
       count(*) = 1 and bool_and(name = 'Vault de B')
from vaults;

insert into rls_check
select 7, 'B no ve las notas del vault de A', '0 filas',
       count(*) || ' fila(s)', count(*) = 0
from notes;

-- ---- Limpieza y resultado ----

reset role;
reset request.jwt.claims;

delete from vaults where id in (select id from seed_vaults);  -- cascade borra las notas

select orden, chequeo, esperado, obtenido, ok
from rls_check order by orden;
