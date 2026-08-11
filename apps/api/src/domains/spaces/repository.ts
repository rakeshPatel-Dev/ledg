import { Types } from "mongoose";

import { SpaceModel, type SpaceDoc } from "./model.js";

export async function createSpace(
  ownerId: Types.ObjectId,
  data: { name: string; type: string }
): Promise<SpaceDoc> {
  const doc = await SpaceModel.create({ ownerId, ...data });
  return toSpaceDto(doc.toObject());
}

export async function findSpacesByOwner(
  ownerId: Types.ObjectId
): Promise<SpaceDoc[]> {
  const docs = await SpaceModel.find({ ownerId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(toSpaceDto);
}

export async function findSpaceById(
  id: string,
  ownerId: Types.ObjectId
): Promise<SpaceDoc | null> {
  const doc = await SpaceModel.findOne({ _id: id, ownerId }).lean();
  return doc ? toSpaceDto(doc) : null;
}

export async function updateSpace(
  id: string,
  ownerId: Types.ObjectId,
  data: Record<string, unknown>
): Promise<SpaceDoc | null> {
  const doc = await SpaceModel.findOneAndUpdate({ _id: id, ownerId }, data, {
    new: true,
    runValidators: true,
  }).lean();
  return doc ? toSpaceDto(doc) : null;
}

export async function deleteSpace(
  id: string,
  ownerId: Types.ObjectId
): Promise<boolean> {
  const result = await SpaceModel.deleteOne({ _id: id, ownerId });
  return result.deletedCount > 0;
}

export async function countUserSpaces(ownerId: Types.ObjectId): Promise<number> {
  return SpaceModel.countDocuments({ ownerId });
}

export async function ensureDefaultSpace(
  ownerId: Types.ObjectId
): Promise<SpaceDoc> {
  const existing = await SpaceModel.findOne({
    ownerId,
    type: "personal",
  }).lean();

  if (existing) {
    return toSpaceDto(existing);
  }

  const created = await SpaceModel.create({
    ownerId,
    name: "Personal",
    type: "personal",
  });
  return created.toObject();
}

function toSpaceDto(doc: Record<string, unknown>): SpaceDoc {
  return { ...doc, id: String(doc._id) } as unknown as SpaceDoc;
}