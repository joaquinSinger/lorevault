/**
 * Mensaje único para fallas de red/Postgres en la capa de storage: el detalle
 * técnico no le sirve al usuario y podría filtrar internals de la base.
 */
export const GENERIC_MESSAGE =
  'No se pudo completar la operación. Revisá tu conexión e intentá de nuevo.'
