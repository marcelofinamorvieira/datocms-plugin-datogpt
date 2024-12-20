//********************************************************************************************
// handleFileField.ts
//
// Extracted logic for handling 'file' fields from generateFieldValue.
//********************************************************************************************

import OpenAI from 'openai';
import { ctxParamsType } from '../../../../entrypoints/Config/ConfigScreen';
import { basePrompt } from '../../../../prompts/BasePrompt';
import generateUploadOnPrompt, {
  availableResolutions,
} from '../../asset/generateUploadOnPrompt';

export async function handleFileField(
  blockLevel: number,
  _itemTypes: Record<string, unknown>, // not used here, just kept signature same
  prompt: string,
  _fieldType: string,
  pluginParams: ctxParamsType,
  locale: string,
  datoKey: string,
  selectedResolution: availableResolutions,
  fieldValue: unknown,
  _alert: (message: string) => Promise<void>,
  isImprove: boolean,
  fieldInfo: {
    name: string;
    apiKey: string;
    validatiors: string | null;
    hint: string | null;
  },
  formValues: Record<string, unknown>,
  _blockInfo: any,
  parentBlockInfo: any,
  fieldsetInfo: any,
  modelName: string,
  openai: OpenAI
) {
  if (
    pluginParams.advancedSettings.blockAssetsGeneration === 'null' &&
    blockLevel > 0
  ) {
    return fieldValue;
  }

  if (isImprove) {
    return fieldValue;
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
