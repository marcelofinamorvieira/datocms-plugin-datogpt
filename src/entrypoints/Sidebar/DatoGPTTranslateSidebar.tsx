import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, SelectField, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import {
  fieldsThatDontNeedTranslation,
  translateFieldValue,
} from '../../utils/TranslateField';
import { ctxParamsType } from '../Config/ConfigScreen';
import { buildClient } from '@datocms/cma-client-browser';
import OpenAI from 'openai';
import { fieldPrompt } from '../../prompts/FieldPrompts';
import { motion, AnimatePresence } from 'framer-motion';

type PropTypes = {
  ctx: RenderItemFormSidebarPanelCtx;
};

async function translateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  selectedLocales: Array<string>,
  originalLocale: string
) {
  const client = buildClient({
    apiToken: ctx.currentUserAccessToken!,
  });

  const fields = await client.fields.list(ctx.itemType);
  const fieldTypeDictionary = fields.reduce((acc, field) => {
    acc[field.api_key] = field.appearance.editor;
    return acc;
  }, {} as Record<string, string>);

  const openai = new OpenAI({
    apiKey: pluginParams.apiKey,
    dangerouslyAllowBrowser: true,
  });

  for (const field in ctx.formValues) {
    if (field === 'internalLocales') continue;
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
      continue;
    }

    let fieldTypePrompt = 'Return the response in the format of ';

    const fieldPromptObject = pluginParams.prompts?.fieldPrompts.single_line
      ? pluginParams.prompts?.fieldPrompts
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

    for (const toLocale of selectedLocales) {
      const translatedField = await translateFieldValue(
        (ctx.formValues[field] as Record<string, unknown>)[originalLocale],
        pluginParams,
        toLocale,
        fieldTypeDictionary[field],
        openai,
        fieldTypePrompt,
        ctx.currentUserAccessToken!
      );

      ctx.setFieldValue(field + '.' + toLocale, translatedField);
    }
  }
}

function DatoGPTTranslateSidebar({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [selectedLocale, setSelectedLocale] = useState<string>(
    (ctx.formValues.internalLocales as Array<string>)[0]
  );
  const [selectedLocales, setSelectedLocales] = useState<Array<string>>(
    (ctx.formValues.internalLocales as Array<string>).filter(
      (locale) => locale !== selectedLocale
    )
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  return (
    <Canvas ctx={ctx}>
      <AnimatePresence mode="wait">
        {!isLoading ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <h3>From</h3>
              <SelectField
                name="multipleOption"
                id="multipleOption"
                label=""
                value={[{ label: selectedLocale, value: selectedLocale }]}
                selectInputProps={{
                  isMulti: false,
                  options: (
                    ctx.formValues.internalLocales as Array<string>
                  ).map((locale) => ({
                    label: locale,
                    value: locale,
                  })),
                }}
                onChange={(newValue) => {
                  setSelectedLocale(newValue?.value || selectedLocale);
                  setSelectedLocales(
                    (ctx.formValues.internalLocales as Array<string>).filter(
                      (locale) => locale !== newValue?.value
                    )
                  );
                }}
              />
              <h3>To</h3>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <SelectField
                name="multipleOption"
                id="multipleOption"
                label=""
                value={selectedLocales.map((locale) => ({
                  label: locale,
                  value: locale,
                }))}
                selectInputProps={{
                  isMulti: true,
                  options: (ctx.formValues.internalLocales as Array<string>)
                    .filter((locale) => locale !== selectedLocale)
                    .map((locale) => ({
                      label: locale,
                      value: locale,
                    })),
                }}
                onChange={(newValue) => {
                  setSelectedLocales(
                    newValue?.map((locale) => locale.value) || []
                  );
                }}
              />
            </div>

            <Button
              fullWidth
              onClick={() => {
                setIsLoading(true);
                translateAllFields(
                  ctx,
                  pluginParams,
                  selectedLocales,
                  selectedLocale
                ).then(() => {
                  setIsLoading(false);
                  ctx.notice('All fields translated successfully');
                });
              }}
            >
              Translate all fields
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Spinner size={48} />
            <h1
              style={{
                margin: '1rem',
                textAlign: 'center',
                color: 'gray',
              }}
            >
              Translating...
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </Canvas>
  );
}

export default DatoGPTTranslateSidebar;
