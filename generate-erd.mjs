import { writeFileSync } from 'node:fs';
import { Prisma } from './src/generated/prisma/index.js';

const models = Prisma.dmmf.datamodel.models;
const quote = (value) => `\`${value}\``;

const typeMap = {
  Int: 'int',
  BigInt: 'bigint',
  String: 'varchar',
  Boolean: 'boolean',
  DateTime: 'datetime',
  Decimal: 'decimal',
  Float: 'float',
  Json: 'json',
  Bytes: 'blob',
};

const output = [];

for (const model of models) {
  const tableName = model.dbName || model.name;

  output.push(`Table ${quote(tableName)} {`);

  const scalarFields = model.fields.filter(
    (field) => field.kind === 'scalar',
  );

  for (const field of scalarFields) {
    const columnName = field.dbName || field.name;
    const columnType = typeMap[field.type] || field.type.toLowerCase();
    const attributes = [];

    if (field.isId) attributes.push('pk');
    if (field.isUnique) attributes.push('unique');

    if (
      field.hasDefaultValue &&
      typeof field.default === 'object' &&
      field.default?.name === 'autoincrement'
    ) {
      attributes.push('increment');
    }

    if (!field.isRequired) {
      attributes.push('null');
    }

    output.push(
      `  ${quote(columnName)} ${columnType}${
        attributes.length ? ` [${attributes.join(', ')}]` : ''
      }`,
    );
  }

  const compositeUniqueIndexes = model.uniqueIndexes || [];

  if (compositeUniqueIndexes.length) {
    output.push('');
    output.push('  indexes {');

    for (const index of compositeUniqueIndexes) {
      const columns = index.fields
        .map((fieldName) => {
          const field = model.fields.find(
            (candidate) => candidate.name === fieldName,
          );

          return quote(field?.dbName || fieldName);
        })
        .join(', ');

      output.push(`    (${columns}) [unique]`);
    }

    output.push('  }');
  }

  output.push('}');
  output.push('');
}

for (const model of models) {
  const sourceTable = model.dbName || model.name;

  const relationFields = model.fields.filter(
    (field) =>
      field.kind === 'object' &&
      Array.isArray(field.relationFromFields) &&
      field.relationFromFields.length > 0,
  );

  for (const relation of relationFields) {
    const targetModel = models.find(
      (modelItem) => modelItem.name === relation.type,
    );

    if (!targetModel) continue;

    const targetTable = targetModel.dbName || targetModel.name;

    relation.relationFromFields.forEach((sourceFieldName, index) => {
      const targetFieldName = relation.relationToFields[index];

      const sourceField = model.fields.find(
        (field) => field.name === sourceFieldName,
      );

      const targetField = targetModel.fields.find(
        (field) => field.name === targetFieldName,
      );

      const sourceColumn = sourceField?.dbName || sourceFieldName;
      const targetColumn = targetField?.dbName || targetFieldName;

      output.push(
        `Ref: ${quote(sourceTable)}.${quote(sourceColumn)} > ` +
        `${quote(targetTable)}.${quote(targetColumn)}`,
      );
    });
  }
}

writeFileSync('madarsa-erd.dbml', output.join('\n'), 'utf8');

console.log(`ERD generated successfully.`);
console.log(`Tables: ${models.length}`);
console.log(`File: madarsa-erd.dbml`);