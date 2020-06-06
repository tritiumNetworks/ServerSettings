create user 'serversettings'@localhost identified by 'srvset1234';

create schema if not exists serversettings;
use serversettings;
grant all privileges on serversettings.* to 'serversettings'@localhost;

create table users_data
(
    id varchar(20) not null,
    constraint users_data_id_uindex
        unique (id)
);
