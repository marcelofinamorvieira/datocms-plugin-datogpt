import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { AnimationControls } from 'framer-motion';
import { ctxParamsType } from '../entrypoints/Config/ConfigScreen';
import OpenAI from 'openai';
import { basePrompt } from '../prompts/BasePrompt';
import locale from 'locale-codes';
import { fieldPrompt } from '../prompts/FieldPrompts';
import { buildClient } from '@datocms/cma-client-browser';

const localeSelect = locale.getByTag;

export const fieldsThatDontNeedTranslation = [
  'date_picker',
  'date_time_picker',
  'integer',
  'float',
  'boolean',
  'map',
  'color_picker',
  'file',
  'gallery',
  'link_select',
  'links_select',
  'video',
];

function extractTextValues(data: unknown): string[] {
  const textValues: string[] = [];
  function traverse(obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (typeof obj === 'object' && obj !== null) {
      if (obj.text !== undefined) {
        textValues.push(obj.text);
      }
      Object.values(obj).forEach(traverse);
    }
  }
  traverse(data);
  return textValues;
}

function removeIds(obj: unknown): any {
  if (Array.isArray(obj)) {
    return obj.map(removeIds);
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'id') {
        newObj[key] = removeIds(value);
      }
    }
    return newObj;
  }
  return obj;
}

function insertObjectAtIndex(array: unknown[], object: unknown, index: number) {
  return [...array.slice(0, index), object, ...array.slice(index)];
}

function reconstructObject(originalObject: unknown, textValues: string[]): any {
  let index = 0;
  function traverse(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => traverse(item));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: any = {};
      for (const key in obj) {
        if (key === 'text' && index < textValues.length) {
          newObj[key] = textValues[index++];
        } else {
          newObj[key] = traverse(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  }
  return traverse(originalObject);
}

function deleteItemIdKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deleteItemIdKeys);
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'itemId') {
        newObj[key] = deleteItemIdKeys(value);
      }
    }
    return newObj;
  }
  return obj;
}

async function translateSeoFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  fieldTypePrompt: string
) {
  const seoObject = fieldValue as Record<string, string>;
  const seoObjectToBeTranslated = {
    title: seoObject.title,
    description: seoObject.description,
  };

  const seoCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          (pluginParams.prompts?.basePrompt || basePrompt) +
          ' translate the following string\n' +
          JSON.stringify(seoObjectToBeTranslated) +
          ' to the language ' +
          localeSelect(toLocale).name +
          fieldTypePrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  const returnedSeoObject = JSON.parse(
    seoCompletion.choices[0].message.content!
  );
  seoObject.title = returnedSeoObject.title;
  seoObject.description = returnedSeoObject.description;
  return seoObject;
}

async function translateBlockValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  apiToken: string
) {
  const cleanedFieldValue = deleteItemIdKeys(fieldValue);

  const client = buildClient({
    apiToken: apiToken,
  });

  for (const block of cleanedFieldValue as any[]) {
    const fields = await client.fields.list(
      block.itemTypeId || block.blockModelId
    );
    const fieldTypeDictionary = fields.reduce((acc, field) => {
      acc[field.api_key] = field.appearance.editor;
      return acc;
    }, {} as Record<string, string>);

    for (const f in block) {
      if (
        f === 'itemTypeId' ||
        f === 'originalIndex' ||
        f === 'blockModelId' ||
        f === 'type' ||
        f === 'children'
      ) {
        continue;
      }

      let nestedFieldValuePrompt = ' Return the response in the format of ';
      nestedFieldValuePrompt += fieldTypeDictionary[f];
      block[f] = await translateFieldValue(
        block[f],
        pluginParams,
        toLocale,
        fieldTypeDictionary[f],
        openai,
        nestedFieldValuePrompt,
        apiToken
      );
    }
  }

  return cleanedFieldValue;
}

async function translateStructuredTextValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  apiToken: string
) {
  const noIdFieldValue = removeIds(fieldValue);
  const blockNodes = (noIdFieldValue as Array<unknown>).reduce(
    (acc: any[], node: any, index: number) => {
      if (node.type === 'block') {
        acc.push({ ...node, originalIndex: index });
      }
      return acc;
    },
    []
  );

  const fieldValueWithoutBlocks = (noIdFieldValue as Array<unknown>).filter(
    (node: any) => node.type !== 'block'
  );

  const textValues = extractTextValues(fieldValueWithoutBlocks);

  const structuredTextcompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          (pluginParams.prompts?.basePrompt || basePrompt) +
          ' translate the following string array ' +
          JSON.stringify(textValues) +
          ' to the language ' +
          localeSelect(toLocale).name +
          ' return the translated strings array in a valid JSON format do not remove spaces or empty strings. The number of returned strings should be the same as the number of strings in the original array. Do not remove any spaces or empty strings from the array.',
      },
    ],
    model: pluginParams.gptModel,
  });

  const returnedTextValues = JSON.parse(
    structuredTextcompletion.choices[0].message.content!
  );

  const translatedBlockNodes = await translateFieldValue(
    blockNodes,
    pluginParams,
    toLocale,
    'rich_text',
    openai,
    '',
    apiToken
  );

  const reconstructedObject = reconstructObject(
    fieldValueWithoutBlocks,
    returnedTextValues
  );

  let finalReconstructedObject = reconstructedObject;

  for (const node of translatedBlockNodes as any[]) {
    finalReconstructedObject = insertObjectAtIndex(
      finalReconstructedObject,
      node,
      node.originalIndex
    );
  }

  const cleanedReconstructedObject = finalReconstructedObject.map(
    ({
      originalIndex,
      ...rest
    }: {
      originalIndex?: number;
      [key: string]: any;
    }) => rest
  );

  return cleanedReconstructedObject;
}

async function translateDefaultFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  openai: OpenAI,
  fieldTypePrompt: string
) {
  const prompt =
    (pluginParams.prompts?.basePrompt || basePrompt) +
    ' translate the following string\n"' +
    fieldValue +
    '"\n to the language ' +
    localeSelect(toLocale).name +
    fieldTypePrompt;

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: prompt,
      },
    ],
    model: pluginParams.gptModel,
  });
  return completion.choices[0].message.content?.replace(/"/g, '');
}

export async function translateFieldValue(
  fieldValue: unknown,
  pluginParams: ctxParamsType,
  toLocale: string,
  fieldType: string,
  openai: OpenAI,
  fieldTypePrompt: string,
  apiToken: string
): Promise<unknown> {
  if (fieldsThatDontNeedTranslation.includes(fieldType) || !fieldValue) {
    return fieldValue;
  }

  // Handle each field type separately for clarity:
  switch (fieldType) {
    case 'seo':
      return translateSeoFieldValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        fieldTypePrompt
      );
    case 'rich_text':
      return translateBlockValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        apiToken
      );
    case 'structured_text':
      return translateStructuredTextValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        apiToken
      );
    default:
      return translateDefaultFieldValue(
        fieldValue,
        pluginParams,
        toLocale,
        openai,
        fieldTypePrompt
      );
  }
}

const TranslateField = async (
  setViewState: React.Dispatch<React.SetStateAction<string>>,
  fieldValue: unknown,
  ctx: RenderFieldExtensionCtx,
  controls: AnimationControls,
  pluginParams: ctxParamsType,
  toLocale: string,
  fieldType: string
) => {
  const fieldPathArray = ctx.fieldPath.split('.');
  fieldPathArray[fieldPathArray.length - 1] = toLocale;

  ctx.disableField(ctx.fieldPath, true);
  setViewState('collapsed');
  controls.start({
    rotate: [0, 360],
    transition: {
      rotate: {
        duration: 1,
        ease: 'linear',
        repeat: Infinity,
      },
    },
  });

  let fieldTypePrompt = 'Return the response in the format of ';

  const fieldPromptObject = pluginParams.prompts?.fieldPrompts.single_line
    ? pluginParams.prompts?.fieldPrompts
    : fieldPrompt;

  if (fieldType !== 'structured_text' && fieldType !== 'rich_text') {
    fieldTypePrompt += fieldPromptObject[fieldType as keyof typeof fieldPrompt];
  }

  const newOpenai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const translatedFieldValue = await translateFieldValue(
    fieldValue,
    pluginParams,
    toLocale,
    fieldType,
    newOpenai,
    fieldTypePrompt,
    ctx.currentUserAccessToken!
  );

  ctx.setFieldValue(fieldPathArray.join('.'), translatedFieldValue);
  ctx.disableField(ctx.fieldPath, false);
  controls.stop();
};

export default TranslateField;
