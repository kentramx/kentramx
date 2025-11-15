-- Paso 1: Agregar 'pendiente_aprobacion' al enum property_status
-- Este debe ser el único cambio en esta transacción
ALTER TYPE property_status ADD VALUE IF NOT EXISTS 'pendiente_aprobacion';