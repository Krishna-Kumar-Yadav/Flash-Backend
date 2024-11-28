/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `chat_rooms` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_name_key" ON "chat_rooms"("name");
