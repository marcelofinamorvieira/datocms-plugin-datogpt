import OpenAI from 'openai';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import generateUploadOnPrompt, {
  Upload,
  availableResolutions,
} from '../asset/generateUploadOnPrompt';
import { basePrompt } from '../../../prompts/BasePrompt';
import locale from 'locale-codes';
import { fieldPrompt } from '../../../prompts/FieldPrompts';
import parseGptValue from './parseGptValue';
import { buildClient } from '@datocms/cma-client-browser';
import { ItemType } from 'datocms-plugin-sdk';
import { htmlToStructuredText } from 'datocms-html-to-structured-text';

const localeSelect = locale.getByTag;

const generateFieldValue = async (
  blockLevel: number,
  itemTypes: Partial<Record<string, ItemType>>,
  prompt: string,
  fieldType: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  currentFieldValue: unknown,
  alert: (message: string) => Promise<void>,
  isImprovement: boolean,
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
  } | null,
  parentBlockInfo: {
    name: string;
    apiKey: string;
    generatedFields: Record<string, unknown>;
  } | null,
  fieldsetInfo: {
    name: string | null;
    hint: string | null;
  } | null,
  modelName: string
) => {
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  let fieldValue = currentFieldValue;

  //if the field is localized, get this current locale value instead:
  if (
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[locale]
  ) {
    fieldValue = (fieldValue as Record<string, unknown>)[locale];
  }

  let fieldTypePrompt = ' Return the response in the format of ';

  if (fieldType === 'file') {
    if (
      pluginParams.advancedSettings.blockAssetsGeneration === 'null' &&
      blockLevel > 0
    ) {
      return null;
    }

    const contextCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            basePrompt +
            'Generate the perfect prompt for a field ' +
            fieldInfo.name +
            ' field, ' +
            ' that is an instance of a ' +
            modelName +
            ' , ' +
            ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
            ' the intention of the user is to ' +
            prompt +
            ' make sure that the prompt generated is specifically for the ' +
            fieldInfo.name +
            ' field. Make the prompt very specific for a ' +
            fieldInfo.name +
            ' field. Make sure your prompt to DALL-E3 takes that into account.' +
            (fieldsetInfo?.name
              ? ' considering it is in the ' + fieldsetInfo.name + ' fieldset '
              : '') +
            (fieldsetInfo?.hint
              ? ' that has the description of ' + fieldsetInfo.hint
              : '') +
            (parentBlockInfo
              ? ' that is part of a block named ' +
                parentBlockInfo.name +
                ' block ' +
                ' considering that we already generated the following fields: ' +
                JSON.stringify(parentBlockInfo.generatedFields, null, 2)
              : '') +
            ' considering the context of the record ' +
            JSON.stringify(formValues, null, 2) +
            ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
            fieldInfo.name +
            ' image depicting ... mainly condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
        },
      ],
      model: pluginParams.gptModel,
    });

    const metaPrompt = contextCompletion.choices[0].message.content!;

    console.log({ metaPrompt });

    return (
      await generateUploadOnPrompt(
        metaPrompt,
        openai,
        datoKey,
        locale,
        pluginParams.dallEModel,
        selectedResolution
      )
    )[0];
  }

  if (fieldType === 'gallery') {
    if (
      pluginParams.advancedSettings.blockAssetsGeneration === 'null' &&
      blockLevel > 0
    ) {
      return null;
    }
    let galleryArray = fieldValue as Array<Upload>;
    if (!galleryArray || !galleryArray.length) {
      galleryArray = [];
    }
    try {
      const contextCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              basePrompt +
              'Generate the perfect prompt for a field ' +
              fieldInfo.name +
              ' field, ' +
              ' that is an instance of a ' +
              modelName +
              ' , ' +
              ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
              ' the intention of the user is to ' +
              prompt +
              ' make sure that the prompt generated is specifically for the ' +
              fieldInfo.name +
              ' field. Make the prompt very specific for a ' +
              fieldInfo.name +
              ' field. Make sure your prompt to DALL-E3 takes that into account.' +
              (fieldsetInfo?.name
                ? ' considering it is in the ' +
                  fieldsetInfo.name +
                  ' fieldset '
                : '') +
              (fieldsetInfo?.hint
                ? ' that has the description of ' + fieldsetInfo.hint
                : '') +
              (parentBlockInfo
                ? ' that is part of a block named ' +
                  parentBlockInfo.name +
                  ' block ' +
                  ' considering that we already generated the following fields: ' +
                  JSON.stringify(parentBlockInfo.generatedFields, null, 2)
                : '') +
              ' considering the context of the record ' +
              JSON.stringify(formValues, null, 2) +
              ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
              fieldInfo.name +
              ' image depicting ... mainly condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
          },
        ],
        model: pluginParams.gptModel,
      });

      const metaPrompt = contextCompletion.choices[0].message.content!;

      console.log({ metaPrompt });

      galleryArray.push(
        (
          await generateUploadOnPrompt(
            metaPrompt,
            openai,
            datoKey,
            locale,
            pluginParams.dallEModel,
            selectedResolution
          )
        )[0]
      );
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
      return galleryArray;
    }

    return galleryArray;
  }

  if (fieldType === 'structured_text') {
    const trimmedFieldInfo = {
      name: fieldInfo.name,
      apiKey: fieldInfo.apiKey,
      validatiors: null,
      hint: fieldInfo.hint,
    };

    const baseDocument = await generateFieldValue(
      0,
      itemTypes,
      prompt +
        ' make the output very long and with several html tags being used',
      'wysiwyg',
      pluginParams,
      locale,
      datoKey,
      selectedResolution,
      '',
      alert,
      isImprovement,
      trimmedFieldInfo,
      formValues,
      null,
      null,
      fieldsetInfo,
      modelName
    );

    const structuredTextBaseDocument = await htmlToStructuredText(baseDocument);

    function replaceValueWithText(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map((item) => replaceValueWithText(item));
      }

      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'value') {
            newObj['text'] = value;
          } else {
            newObj[key] = replaceValueWithText(value);
          }
        }
        return newObj;
      }

      return obj;
    }

    function removeSpanType(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map((item) => removeSpanType(item));
      }

      if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'type' && value === 'span') {
            continue;
          }
          newObj[key] = removeSpanType(value);
        }
        return newObj;
      }

      return obj;
    }

    const cleanedDocument = removeSpanType(
      structuredTextBaseDocument?.document
    );

    const structuredTextBase = replaceValueWithText(cleanedDocument.children);

    const validators = JSON.parse(fieldInfo.validatiors!);
    const structuredTextBlocks = validators.structured_text_blocks.item_types;

    if (!structuredTextBlocks.length) {
      return structuredTextBase;
    }

    const blocksWithNames = structuredTextBlocks.map((block: string) => {
      return {
        name: itemTypes[block]!.attributes.name!,
        apiKey: itemTypes[block]!.attributes.api_key!,
        blockModelId: itemTypes[block]!.id!,
      };
    });

    const blockPrompt =
      basePrompt +
      ' Based on the prompt ' +
      prompt +
      ' what available blocks should I insert into this html? ' +
      baseDocument +
      ' The available blocks are: ' +
      JSON.stringify(blocksWithNames, null, 2) +
      ' return the response as an array of objects as a valid JSON, deleting the blocks that should not be created for this prompt, and keeping the ones that should be created. Make sure to keep only the blocks that are appropriate in the context of the HTML. Choose only the ones really necessary, be conservative with the number of blocks you insert. You can repeat a block more times than one if you think it is necessary for the prompt, also, make sure not to repeat info that is already present in the html ' +
      ' add to the following object a "prompt" key to each block, the prompt value should be an instruction, a prompt, to generate the value, always starting with "Generate a block that..."';

    const blockPromptResponse = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: blockPrompt,
        },
      ],
      model: pluginParams.gptModel,
    });

    const blockTypeResponses = await JSON.parse(
      blockPromptResponse.choices[0].message.content!
    );

    console.log({ blockTypeResponses });

    const blockArray: any[] = [];

    for (const block of blockTypeResponses) {
      await generateFieldValue(
        blockLevel,
        itemTypes,
        block.prompt,
        'rich_text',
        pluginParams,
        locale,
        datoKey,
        selectedResolution,
        blockArray,
        alert,
        isImprovement,
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

    const structuredFormatedBlockArray = blockArray.map((block) => {
      const blockCopy = { ...block };
      delete blockCopy.blockModelId;
      return {
        blockModelId: block.itemTypeId,
        children: [{ text: '' }],
        type: 'block',
        ...blockCopy,
      };
    });

    const finalPrompt =
      basePrompt +
      ' insert into the following JSON array of objects :' +
      JSON.stringify(structuredTextBase, null, 2) +
      ' the following objects in this JSON array, in the approprite positions, where it is contextually approprite, do not repeat any object, and use all of them: ' +
      JSON.stringify(structuredFormatedBlockArray, null, 2) +
      ' return the exact JSON array at the start of this message, do not remove or alter anything, just add the objects from the second array into the first one in the correct positions';

    const finalCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: finalPrompt,
        },
      ],
      model: pluginParams.gptModel,
    });

    const finalResponse = JSON.parse(
      finalCompletion.choices[0].message.content!
    );

    console.log({ finalResponse });

    return finalResponse;
  }

  if (!!blockInfo) {
    const client = buildClient({
      apiToken: datoKey,
    });

    if (blockInfo.apiKey === 'auto_select_gpt_plugin') {
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

      console.log({ blockPrompt });

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

      console.log({ blockTypeResponses });

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
          isImprovement,
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

    for (const field in fieldTypeDictionary) {
      if (fieldTypeDictionary[field].type === 'rich_text') {
        if (blockLevel > pluginParams.advancedSettings.blockGenerateDepth - 1) {
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
          [],
          alert,
          isImprovement,
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
        attributes[field] = fieldValue;
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
          null,
          alert,
          isImprovement,
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
        attributes[field] = fieldValue;
      }
    }

    fieldValueCopy.push({
      itemTypeId: blockInfo.blockModelId,
      ...attributes,
    });

    return fieldValueCopy;
  }

  const fieldPromptObject = pluginParams.prompts?.fieldPrompts.single_line
    ? pluginParams.prompts?.fieldPrompts
    : fieldPrompt;

  if (
    !(
      fieldPromptObject[fieldType as keyof typeof fieldPrompt] ||
      fieldPrompt[fieldType as keyof typeof fieldPrompt]
    )
  ) {
    return null; //HERE
  }

  fieldTypePrompt +=
    fieldPromptObject[fieldType as keyof typeof fieldPrompt] ||
    fieldPrompt[fieldType as keyof typeof fieldPrompt];

  let formattedPrompt = pluginParams.prompts?.basePrompt || basePrompt;

  const recordContextJson = formValues;

  delete recordContextJson.internalLocales;

  console.log({ prompt });

  const contextCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          basePrompt +
          'Generate the perfect prompt for a field ' +
          fieldInfo.name +
          ' field, ' +
          ' that is an instance of a ' +
          modelName +
          ' , ' +
          ' Respect the name of the field in regards to context of the meta prompt that you will generate.' +
          ' the intention of the user is to ' +
          prompt +
          ' make sure that the prompt generated is specifically for the ' +
          fieldInfo.name +
          ' field. Make the prompt very specific for a ' +
          fieldInfo.name +
          ' field. ' +
          (fieldsetInfo?.name
            ? ' considering it is in the ' + fieldsetInfo.name + ' fieldset '
            : '') +
          (fieldsetInfo?.hint
            ? ' that has the description of ' + fieldsetInfo.hint
            : '') +
          (parentBlockInfo
            ? ' that is part of a block named ' +
              parentBlockInfo.name +
              ' block ' +
              ' considering that we already generated the following fields: ' +
              JSON.stringify(parentBlockInfo.generatedFields, null, 2)
            : '') +
          ' considering the context of the record ' +
          JSON.stringify(formValues, null, 2) +
          ' do not mention that it has several locales or languages, remember to return a prompt, that should always start with "Generate a ' +
          fieldInfo.name +
          ' field with a value ... condsidering that the context talks about... and that there are already fields with values like ...(using here information from the context of the record provided above)',
      },
    ],
    model: pluginParams.gptModel,
  });

  const metaPrompt = contextCompletion.choices[0].message.content;

  console.log({ metaPrompt });

  console.log({ fieldValue });

  if (!isImprovement) {
    formattedPrompt +=
      fieldTypePrompt +
      ' what you should do is ' +
      metaPrompt +
      ' the label of the field that you are generating a value to is ' +
      fieldInfo.name +
      ' make it so the field label is the most important contextual clue. If the lable is answer, the result should be an answer, if the label is title, the result should be a title, and so on. ' +
      (fieldInfo.hint ? ' its writting instruction is ' + fieldInfo.hint : '') +
      (fieldInfo.validatiors && fieldType !== 'rich_text'
        ? ' and its validators are ' +
          fieldInfo.validatiors +
          ' if present, always respect the length max and min number of characters'
        : '') +
      ' use this information only for conceptual purposes, do not mention it in your response or make it alter the response format, do not include the field label in your response, but if the field label is "URL" return a URL, if it is "title" return a title, and so on. But always keep the response in the format of ' +
      fieldTypePrompt +
      ' translate your response to ' +
      localeSelect(locale).name;
  } else {
    formattedPrompt +=
      ' Improove on the previous field value that was ' +
      (typeof fieldValue === 'object'
        ? JSON.stringify(fieldValue, null, 2)
        : fieldValue) +
      ' keeping the most of the initial value, only modify what you need to improve the value to follow the following instruction: what you should do is ' +
      prompt +
      ' the label of the field that you are generating a value to is ' +
      fieldInfo.name +
      'make it so the field label is the most important contextual clue. ' +
      (fieldInfo.hint ? ' its writting instruction is ' + fieldInfo.hint : '') +
      (fieldInfo.validatiors && fieldType !== 'rich_text'
        ? ' and its validators are ' +
          fieldInfo.validatiors +
          ' if present, always respect the length max and min number of characters'
        : '') +
      ' use this information only for conceptual purposes, do not mention it in your response or make it alter the response format, do not include the field label in your response, but if the field label is "URL" return a URL, if it is "title" return a title, and so on. But always keep the response in the format of ' +
      fieldTypePrompt +
      ' By doing the following:' +
      prompt +
      fieldTypePrompt +
      ' translate your response to ' +
      localeSelect(locale).name +
      fieldTypePrompt;
  }

  console.log({ formattedPrompt });

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: formattedPrompt,
      },
    ],
    model: pluginParams.gptModel,
  });

  const parsedValue = await parseGptValue(
    fieldType,
    completion.choices[0].message.content!,
    openai,
    datoKey,
    locale,
    pluginParams,
    selectedResolution
  ).catch((error) => {
    throw (
      'GPT response for the "' +
      fieldInfo.name +
      '" field: \n' +
      completion.choices[0].message.content +
      ' error: ' +
      error
    );
  });

  console.log({ parsedValue });

  return parsedValue;
};

export default generateFieldValue;
