-- Rename batch display names from IV to IT (Information Technology)
update batches set name = 'IT A' where id = 'A' and name = 'IV A';
update batches set name = 'IT B' where id = 'B' and name = 'IV B';
update batches set name = 'IT C' where id = 'C' and name = 'IV C';
update batches set name = 'IT D' where id = 'D' and name = 'IV D';
