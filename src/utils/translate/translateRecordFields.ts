//********************************************************************************************
// translateRecordFields.ts
//
// This utility function abstracts the logic of translating all fields of a record from one
// locale into one or multiple target locales. It was previously inline in DatoGPTTranslateSidebar.tsx
// and is now extracted here to improve maintainability and separation of concerns.
//
// The function:
// - Fetches fields for the current item type.
// - Determines which fields are localized and translatable.
// - For each translatable field, it translates the value from the original locale to each selected target locale.
// - Uses OpenAI for translations, and updates the form values accordingly.
//
// Error handling and asynchronous flow are managed here, so calling code can remain cleaner.
//
//********************************************************************************************

import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import OpenAI from 'openai';
import { ctxParamsType } from '../../entrypoints/Config/ConfigScreen';
import { fieldsThatDontNeedTranslation, translateFieldValue } from '../TranslateField';
import { fieldPrompt } from '../../prompts/FieldPrompts';

export async function translateRecordFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  selectedLocales: Array<string>,
  originalLocale: string
): Promise<void> {
  // Build a DatoCMS CMA client to fetch field information
  const { buildClient } = await import('@datocms/cma-client-browser');
  const client = buildClient({
    apiToken: ctx.currentUserAccessToken!,
  });

  // Retrieve field list for the current model
  const fields = await client.fields.list(ctx.itemType);
  const fieldTypeDictionary = fields.reduce((acc, field) => {
    acc[field.api_key] = field.appearance.editor;
    return acc;
  }, {} as Record<string, string>);

  // Prepare OpenAI instance for translation calls
  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  // For each field in the record's form values:
  for (const field in ctx.formValues) {
    // Skip internal helper fields
    if (field === 'internalLocales') continue;

    // Check if field is localized and can be translated
    const isLocalized = !!(
      !fieldsThatDontNeedTranslation.includes(fieldTypeDictionary[field]) &&
      ctx.formValues[field] &&
      typeof ctx.formValues[field] === 'object' &&
      !Array.isArray(ctx.formValues[field]) &&
      (ctx.formValues[field] as Record<string, unknown>)[
        (ctx.formValues.internalLocales as string[])[0]
      ]
    );

    if (!isLocalized) {
      // If not localized or not translatable, skip
      continue;
    }

    // Construct the fieldTypePrompt for translation
    let fieldTypePrompt = 'Return the response in the format of ';
    const fieldPromptObject = pluginParams.prompts?.fieldPrompts?.single_line
      ? pluginParams.prompts.fieldPrompts
      : fieldPrompt;

    if (
      fieldTypeDictionary[field] !== 'structured_text' &&
      fieldTypeDictionary[field] !== 'rich_text'
    ) {
      fieldTypePrompt +=
        fieldPromptObject[
          fieldTypeDictionary[field] as keyof typeof fieldPrompt
        ];
    }

    // Translate the field value to each target locale
    for (const toLocale of selectedLocales) {
      const originalFieldValue = (ctx.formValues[field] as Record<string, unknown>)[originalLocale];
      const translatedField = await translateFieldValue(
        originalFieldValue,
        pluginParams,
        toLocale,
        fieldTypeDictionary[field],
        openai,
        fieldTypePrompt,
        ctx.currentUserAccessToken!
      );

      // Update the form with the translated field value
      ctx.setFieldValue(field + '.' + toLocale, translatedField);
    }
  }
}