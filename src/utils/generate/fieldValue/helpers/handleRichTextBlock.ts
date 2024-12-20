//********************************************************************************************
// handleRichTextBlock.ts
//
// Extracted logic for handling modular content (rich_text) blocks from generateFieldValue.
//
// This handles cases when blockInfo is not null, meaning we are dealing with rich_text fields
// that contain block models.
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../../entrypoints/Config/ConfigScreen';
import { basePrompt } from '../../../../prompts/BasePrompt';
import { availableResolutions } from '../../asset/generateUploadOnPrompt';
import generateFieldValue from '../generateFieldValue';
import { ItemType } from 'datocms-plugin-sdk';
import { buildClient } from '@datocms/cma-client-browser';

export async function handleRichTextBlock(
  blockLevel: number,
  itemTypes: Partial<Record<string, ItemType>>,
  prompt: string,
  fieldType: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  fieldValue: unknown,
  alert: (message: string) => Promise<void>,
  isImprove: boolean,
  fieldInfo: {
    name: string;
    apiKey: string;
    validatiors: string | null;
    hint: string | null;
  },
  formValues: Record<string, unknown>,
  blockInfo: {
    name: string;
    apiKey: string;
    blockModelId: string;
    availableBlocks: string[];
  },
  parentBlockInfo: {
    name: string;
    apiKey: string;
    generatedFields: Record<string, unknown>;
  } | null,
  fieldsetInfo: {
    name: string | null;
    hint: string | null;
  } | null,
  modelName: string,
  openai: OpenAI
) {
  const client = buildClient({
    apiToken: datoKey,
  });

  if (isImprove) {
    if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
      return [];
    }
    const fieldValueCopy = fieldValue as Array<Record<string, any>>;
    const fields = await client.fields.list(fieldValueCopy[0].itemTypeId);
    const orderedFields = fields.sort((a, b) => a.position - b.position);
    const fieldTypeDictionary = orderedFields.reduce((acc, field) => {
      acc[field.api_key] = {
        type: field.appearance.editor,
        validators: field.validators
          ? JSON.stringify(field.validators, null, 2)
          : null,
        hint: field.hint ? JSON.stringify(field.hint, null, 2) : null,
        availableBlocks:
          (field.validators.rich_text_blocks as Record<string, string[]>)
            ?.item_types ?? [],
      };
      return acc;
    }, {} as Record<string, { type: string; validators: string | null; hint: string | null; availableBlocks: string[] }>);

    const attributes = { ...fieldTypeDictionary };

    for (const block of fieldValueCopy) {
      for (const field in block) {
        if (field === 'itemId' || field === 'itemTypeId') {
          continue;
        }
        if (fieldTypeDictionary[field].type === 'rich_text') {
          if (
            blockLevel >
            pluginParams.advancedSettings.blockGenerateDepth - 1
          ) {
            return null;
          }
          const fieldValue = await generateFieldValue(
            blockLevel + 1,
            itemTypes,
            prompt,
            fieldTypeDictionary[field].type,
            pluginParams,
            locale,
            datoKey,
            selectedResolution,
            block[field],
            alert,
            isImprove,
            {
              name: field,
              apiKey: field,
              validatiors: fieldTypeDictionary[field].validators,
              hint: fieldTypeDictionary[field].hint,
            },
            formValues,
            {
              name: field,
              apiKey: 'auto_select_gpt_plugin',
              blockModelId: fieldTypeDictionary[field].availableBlocks[0],
              availableBlocks: fieldTypeDictionary[field].availableBlocks,
            },
            {
              name: blockInfo.name,
              apiKey: blockInfo.apiKey,
              generatedFields: attributes,
            },
            fieldsetInfo,
            modelName
          );
          block[field] = fieldValue;
        } else {
          const fieldValue = await generateFieldValue(
            blockLevel + 1,
            itemTypes,
            prompt +
              ' that is part of a ' +
              blockInfo.name +
              ' block, and is a ' +
              fieldInfo.name +
              ' field',
            fieldTypeDictionary[field].type,
            pluginParams,
            locale,
            datoKey,
            selectedResolution,
            block[field],
            alert,
            isImprove,
            {
              name: field,
              apiKey: field,
              validatiors: fieldTypeDictionary[field].validators,
              hint: fieldTypeDictionary[field].hint,
            },
            formValues,
            null,
            {
              name: blockInfo.name,
              apiKey: blockInfo.apiKey,
              generatedFields: attributes,
            },
            fieldsetInfo,
            modelName
          );
          block[field] = fieldValue;
        }
      }
    }

    return fieldValueCopy;
  }

  if (!isImprove && blockInfo.apiKey === 'auto_select_gpt_plugin') {
    const availableFieldNames = blockInfo.availableBlocks.map((blockId) => {
      return {
        name: itemTypes[blockId]!.attributes.name!,
        apiKey: itemTypes[blockId]!.attributes.api_key!,
        blockModelId: itemTypes[blockId]!.id!,
      };
    });

    const blockPrompt =
      basePrompt +
      ' Based on the prompt ' +
      prompt +
      ' what available blocks should I create to better acomplish the prompt? The available blocks are: ' +
      JSON.stringify(availableFieldNames, null, 2) +
      ' return the response as an array of objects as a valid JSON, deleting the blocks that should not be created for this prompt, and keeping the ones that should be created. You can repeat a block more times than one if you think it is necessary for the prompt' +
      ' add to the following object a "prompt" key to each block, the prompt value should be an instruction, a prompt, to generate the value, always starting with "Generate a block that..."';

    const blockTypeCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: blockPrompt,
        },
      ],
      model: pluginParams.gptModel,
    });

    const blockTypeResponses = await JSON.parse(
      blockTypeCompletion.choices[0].message.content!
    );

    const currentValueCopy = fieldValue as Array<Record<string, any>>;

    for (const block of blockTypeResponses) {
      await generateFieldValue(
        blockLevel,
        itemTypes,
        block.prompt,
        fieldType,
        pluginParams,
        locale,
        datoKey,
        selectedResolution,
        currentValueCopy,
        alert,
        isImprove,
        fieldInfo,
        formValues,
        {
          name: block.name,
          apiKey: block.apiKey,
          blockModelId: block.blockModelId,
          availableBlocks: block.availableBlocks,
        },
        null,
        fieldsetInfo,
        modelName
      );
    }

    return currentValueCopy;
  }

  const fieldValueCopy = fieldValue as Array<Record<string, any>>;
  const fields = await client.fields.list(blockInfo.blockModelId);
  const orderedFields = fields.sort((a, b) => a.position - b.position);
  const fieldTypeDictionary = orderedFields.reduce((acc, field) => {
    acc[field.api_key] = {
      type: field.appearance.editor,
      validators: field.validators
        ? JSON.stringify(field.validators, null, 2)
        : null,
      hint: field.hint ? JSON.stringify(field.hint, null, 2) : null,
      availableBlocks:
        (field.validators.rich_text_blocks as Record<string, string[]>)
          ?.item_types ?? [],
    };
    return acc;
  }, {} as Record<string, { type: string; validators: string | null; hint: string | null; availableBlocks: string[] }>);

  const attributes = { ...fieldTypeDictionary };

  for (const f in fieldTypeDictionary) {
    if (fieldTypeDictionary[f].type === 'rich_text') {
      if (blockLevel > pluginParams.advancedSettings.blockGenerateDepth - 1) {
        return null;
      }
      const fieldValue = await generateFieldValue(
        blockLevel + 1,
        itemTypes,
        prompt,
        fieldTypeDictionary[f].type,
        pluginParams,
        locale,
        datoKey,
        selectedResolution,
        [],
        alert,
        isImprove,
        {
          name: f,
          apiKey: f,
          validatiors: fieldTypeDictionary[f].validators,
          hint: fieldTypeDictionary[f].hint,
        },
        formValues,
        {
          name: f,
          apiKey: 'auto_select_gpt_plugin',
          blockModelId: fieldTypeDictionary[f].availableBlocks[0],
          availableBlocks: fieldTypeDictionary[f].availableBlocks,
        },
        {
          name: blockInfo.name,
          apiKey: blockInfo.apiKey,
          generatedFields: attributes,
        },
        fieldsetInfo,
        modelName
      );
      attributes[f] = fieldValue;
    } else {
      const fieldValue = await generateFieldValue(
        blockLevel + 1,
        itemTypes,
        prompt +
          ' that is part of a ' +
          blockInfo.name +
          ' block, and is a ' +
          fieldInfo.name +
          ' field',
        fieldTypeDictionary[f].type,
        pluginParams,
        locale,
        datoKey,
        selectedResolution,
        null,
        alert,
        isImprove,
        {
          name: f,
          apiKey: f,
          validatiors: fieldTypeDictionary[f].validators,
          hint: fieldTypeDictionary[f].hint,
        },
        formValues,
        null,
        {
          name: blockInfo.name,
          apiKey: blockInfo.apiKey,
          generatedFields: attributes,
        },
        fieldsetInfo,
        modelName
      );
      attributes[f] = fieldValue;
    }
  }

  fieldValueCopy.push({
    itemTypeId: blockInfo.blockModelId,
    ...attributes,
  });

  return fieldValueCopy;
}
