-- Migración 07: Sanitizar URLs heredadas de Google Places para política de costo cero ($0.00)
-- Reemplaza cualquier URL remanente de places.googleapis.com con fotografía de alta resolución por categoría
UPDATE places p
SET image_url = CASE c.slug
  WHEN 'comida' THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  WHEN 'turismo' THEN 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
  WHEN 'actividades' THEN 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80'
  WHEN 'entretenimiento' THEN 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80'
  WHEN 'compras' THEN 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'
  WHEN 'eventos' THEN 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80'
  ELSE 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
END
FROM categories c
WHERE p.category_id = c.id
  AND p.image_url LIKE '%places.googleapis.com%';
