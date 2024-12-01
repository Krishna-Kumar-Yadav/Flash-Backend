/*
  Warnings:

  - Added the required column `fileUrl` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "fileUrl" TEXT NOT NULL;
