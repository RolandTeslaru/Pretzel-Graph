-- Hash of the assistant workflow last installed from the shipped asset; null until the first install.
alter table workspace add column assistant_version text;
