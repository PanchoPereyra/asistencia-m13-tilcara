-- Ver duplicados por nombre + apellido
SELECT nombre, apellido, count(*) as cantidad
FROM jugadores
GROUP BY nombre, apellido
HAVING count(*) > 1
ORDER BY cantidad DESC;
