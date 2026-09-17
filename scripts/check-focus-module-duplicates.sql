SELECT title, count(*) AS how_many, array_agg(id ORDER BY id) AS ids
FROM training_modules
GROUP BY title
HAVING count(*) > 1;
