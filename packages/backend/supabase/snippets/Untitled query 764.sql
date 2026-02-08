-- select drawer_id, count(b.display_name) from blueprints b group by b.drawer_id
select * from blueprints b where b.display_name = 'Text Input'