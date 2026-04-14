-- -------------------------------------------------------------
-- TablePlus 4.7.1(428)
--
-- https://tableplus.com/
--
-- Database: postgres
-- Generation Time: 2026-03-12 12:34:36.5380
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."users";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Table Definition
CREATE TABLE "public"."users" (
    "id" uuid NOT NULL,
    "provider_id" uuid NOT NULL,
    "username" text,
    "email" varchar(255) NOT NULL,
    "full_name" text,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" timestamptz,
    "last_login_ip" text,
    "metadata" jsonb,
    "is_deleted" bool NOT NULL DEFAULT false,
    "quota" jsonb,
    PRIMARY KEY ("id")
);

-- Table Comment
COMMENT ON TABLE "public"."users" IS 'User model representing application users.';

INSERT INTO "public"."users" ("id", "provider_id", "username", "email", "full_name", "created_at", "updated_at", "last_login_at", "last_login_ip", "metadata", "is_deleted", "quota") VALUES
('04762ee8-8a2a-42b6-ae87-a4aa37dc6d26', '332ef211-f010-45da-bd25-3115b9f51758', NULL, 'naveendkumar@gmail.com', NULL, '2026-01-19 04:09:43.100442+00', '2026-01-19 04:09:43.100448+00', '2026-01-19 04:09:43.100264+00', NULL, NULL, 'f', NULL),
('09b4894c-d988-4551-9bcd-6e3127e01303', '95bed2cc-a519-430f-ad94-1d3ef2114fdc', NULL, 'iverson.varun@gmail.com', NULL, '2026-01-16 05:17:27.406149+00', '2026-03-05 09:41:25.184606+00', '2026-03-05 09:40:59.066327+00', NULL, '{"hasOnboarded": true}', 'f', '{"usage": {}, "last_reset": "2026-03-05T09:41:02.482542+00:00"}'),
('111b36b1-9630-4190-af43-17114c8acaa8', 'f9a1d9d9-4615-4675-8be7-51d6655a344c', NULL, 'chandru89new@gmail.com', NULL, '2026-01-14 06:05:11.197246+00', '2026-03-11 14:13:43.18158+00', '2026-03-10 12:55:26.69753+00', NULL, '{"hasOnboarded": true}', 'f', '{"usage": {"messages": 2, "molecule_searches": 1}, "last_reset": "2026-03-11T13:56:07.791730+00:00"}'),
('18bbabd5-1e86-4e64-8ada-af80c47168da', '734ee006-1746-495e-b33c-33f17e05456e', NULL, 'mynameistanmay@gmail.com', NULL, '2026-02-06 10:54:25.181469+00', '2026-02-23 11:49:53.600215+00', '2026-02-06 10:54:25.181305+00', NULL, NULL, 'f', '{"usage": {}, "last_reset": "2026-02-23T11:49:53.600113+00:00"}'),
('1f405b10-6ced-472b-bd9e-1b8f619a9dc5', '69e206c9-d8ad-460f-9634-6ca60449ab8a', NULL, 'tanmaybodas1908@gmail.com', NULL, '2026-02-06 10:36:26.561613+00', '2026-02-23 11:55:15.943272+00', '2026-02-23 11:55:15.943196+00', NULL, NULL, 'f', NULL),
('28dba522-2e63-466d-a9eb-0c7565772c74', '5e583ae3-911a-4962-92ec-31b78f77c7df', NULL, 'gb@flaskai.co', NULL, '2026-01-13 12:22:06.759341+00', '2026-03-10 11:12:47.494284+00', '2026-03-02 19:58:15.909723+00', NULL, '{"usage": {"molecule_searches": 1}, "last_reset": "2026-02-20T05:50:17.137736+00:00", "hasOnboarded": true}', 'f', '{"usage": {"messages": 13}, "last_reset": "2026-03-10T04:18:56.574763+00:00"}'),
('3dd74948-7531-486b-a253-7d621474f6cc', 'f817d198-7509-4708-a3da-69b2a3423c6f', NULL, 'chandru@flaskai.co', NULL, '2026-01-14 11:28:33.850683+00', '2026-03-11 06:21:52.002118+00', '2026-01-14 11:28:38.616128+00', NULL, '{"hasOnboarded": true}', 'f', '{"usage": {"messages": 1}, "last_reset": "2026-03-11T05:53:14.660250+00:00"}'),
('4b954fff-16dc-4ad4-b9f2-84c1d021c393', '07a375d4-48da-4581-8f9d-f1ba232b2be7', NULL, 'chandru-test@mail.com', NULL, '2026-01-16 14:37:00.309517+00', '2026-01-16 14:37:00.309526+00', '2026-01-16 14:37:00.309279+00', NULL, NULL, 'f', NULL),
('64ce233d-8dd8-4151-9c07-9882ddb76f7e', '3eb2baeb-27d0-4526-97be-d4bf2ffc5582', NULL, 'kb@flaskai.co', NULL, '2026-01-15 03:39:21.011906+00', '2026-03-11 08:56:13.425051+00', '2026-01-22 13:44:55.112401+00', NULL, '{"usage": {"messages": 2}, "last_reset": "2026-02-16T07:23:41.412746+00:00", "hasOnboarded": true}', 'f', '{"usage": {"messages": 8}, "last_reset": "2026-03-11T04:01:00.544403+00:00"}'),
('6719fc8f-1de3-49ca-afa6-dae552c7c36c', '2fb28c4e-decf-4b78-9afb-e1345f390c64', NULL, 'varun@flaskai.co', NULL, '2026-01-16 13:14:05.850757+00', '2026-03-04 06:42:47.41837+00', '2026-01-16 13:40:11.706038+00', NULL, '{"usage": {"messages": 3}, "last_reset": "2026-02-20T08:32:22.057166+00:00"}', 'f', '{"usage": {}, "last_reset": "2026-03-04T06:42:47.418299+00:00"}'),
('68f469ae-8146-4a7e-9c67-c4d7b4bba8c7', 'cdbbd8f7-6f6f-4b77-bbdb-91879a51c46a', NULL, 'nagnaveen10@gmail.com', NULL, '2026-02-25 07:40:03.332574+00', '2026-02-25 07:40:03.33258+00', '2026-02-25 07:40:03.332348+00', NULL, NULL, 'f', '{"plan": "basic", "usage": {}, "limits": {"messages": 25}, "period": "daily", "created_at": "2026-02-25T07:40:03.332358+00:00", "last_reset": "2026-02-25T07:40:03.332358+00:00"}'),
('a4f23168-8f76-4199-ad9f-b1ff2a95f5e1', 'c51d3693-2889-46db-a191-91e8841e25c4', NULL, 'sumanag24@gmail.com', NULL, '2026-02-25 07:39:03.781961+00', '2026-02-25 07:39:03.781967+00', '2026-02-25 07:39:03.781727+00', NULL, NULL, 'f', '{"plan": "basic", "usage": {}, "limits": {"messages": 25}, "period": "daily", "created_at": "2026-02-25T07:39:03.781738+00:00", "last_reset": "2026-02-25T07:39:03.781738+00:00"}'),
('b5f4dcb2-648e-4c4f-a689-7d4fe504cc2f', 'ad8b4d6a-449f-47a3-9a50-f4b8c5ec8663', NULL, 'kiranapr987@gmail.com', NULL, '2026-01-20 16:42:09.832954+00', '2026-03-11 08:43:27.416345+00', '2026-03-11 03:51:39.329473+00', NULL, '{"hasOnboarded": true}', 'f', '{"usage": {"messages": 19}, "last_reset": "2026-03-11T03:51:41.197925+00:00"}'),
('c69253fd-b619-4b97-92b3-7fe2d7d6ac1e', 'c5034ff0-a340-4331-ab77-59def9302648', NULL, 'mainak@flaskai.co', NULL, '2026-01-15 11:59:46.297261+00', '2026-03-10 14:08:04.324608+00', '2026-03-10 14:08:04.324556+00', NULL, '{"hasOnboarded": true}', 'f', '{"usage": {}, "last_reset": "2026-03-10T14:07:44.481498+00:00"}'),
('d1380e9a-2a3e-44e1-b6af-8d39497d7a76', 'c8ade9a9-046f-4eb9-9f9e-affbde4d2eca', NULL, 'bhavanau19@gmail.com', NULL, '2026-03-11 03:02:00.8338+00', '2026-03-11 05:10:20.171134+00', '2026-03-11 04:45:44.956632+00', NULL, '{"hasOnboarded": true, "onboarding_status": {"error": null, "attempted_at": "2026-03-11T03:02:02.355858+00:00", "postgres_done": true, "opensearch_done": true}}', 'f', '{"plan": "basic", "usage": {"messages": 11}, "limits": {"messages": 25, "molecule_searches": 10}, "period": "daily", "created_at": "2026-03-11T03:02:00.833534+00:00", "last_reset": "2026-03-11T03:02:00.833534+00:00"}'),
('e3b8a5c4-b760-4be0-bc03-bc3ad47f56a3', '2805a114-c1b5-4984-bf9e-9225c14114e4', NULL, 'tanmaybodas19@gmail.com', NULL, '2026-02-04 12:04:22.317089+00', '2026-02-23 11:42:31.476393+00', '2026-02-04 12:37:01.827688+00', NULL, NULL, 'f', '{"usage": {}, "last_reset": "2026-02-23T11:42:31.476332+00:00"}'),
('ef6c9448-45ec-41d6-aa37-50d8234f6e4b', '24693ddb-e6b6-48b6-9368-f906522de595', NULL, '123@gmail.com', NULL, '2026-02-23 12:15:33.57571+00', '2026-02-23 12:19:13.056211+00', '2026-02-23 12:19:13.056132+00', NULL, NULL, 'f', '{"plan": "basic", "usage": {}, "limits": {"messages": 25}, "period": "daily", "created_at": "2026-02-23T12:15:33.575453+00:00", "last_reset": "2026-02-23T12:15:33.575453+00:00"}'),
('ffe3b5a7-2291-485a-aa7f-f8f9f899bf7a', 'b05fbd1f-398c-4050-9b0a-66d3c7fafa6d', NULL, 'venkatram.reddy@l1laboratories.com', NULL, '2026-02-24 07:11:13.934129+00', '2026-02-25 07:36:04.574175+00', '2026-02-24 07:11:13.933913+00', NULL, NULL, 'f', '{"plan": "basic", "usage": {"messages": 2}, "limits": {"messages": 25}, "period": "daily", "created_at": "2026-02-24T07:11:13.933923+00:00", "last_reset": "2026-02-25T07:30:34.757458+00:00"}');
