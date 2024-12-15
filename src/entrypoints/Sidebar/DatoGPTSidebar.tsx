import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextareaAutosize from 'react-textarea-autosize';
import s from '../styles.module.css';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import { EditorType } from '../../types/editorTypes';

type PropTypes = {
  ctx: RenderItemFormSidebarPanelCtx;
};

async function generateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  prompt: string,
  isImprove: boolean
) {
  const fieldsObject = Object.entries(ctx.fields) //order fields by position
    .sort((a, b) => a[1]!.attributes.position - b[1]!.attributes.position)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const currentFormValues = ctx.formValues;

  for (const field in fieldsObject) {
    const fieldShouldNotBeGenerated =
      field === 'internalLocales' ||
      !pluginParams.advancedSettings.generateValueFields.includes(
        ctx.fields[field]!.attributes.appearance.editor as EditorType
      );

    if (!fieldShouldNotBeGenerated) continue;

    const fieldType = ctx.fields[field]!.attributes.appearance.editor;

    const fieldValue = ctx.formValues[ctx.fields[field]!.attributes.api_key];

    const fieldsetInfo = ctx.fields[field]!.relationships.fieldset.data?.id
      ? {
          name:
            ctx.fieldsets[ctx.fields[field]!.relationships.fieldset.data?.id]
              ?.attributes.title ?? null,
          hint:
            ctx.fieldsets[ctx.fields[field]!.relationships.fieldset.data?.id]
              ?.attributes.hint ?? null,
        }
      : null;

    const generatedFieldValue = await generateFieldValue(
      0,
      ctx.itemTypes,
      prompt,
      fieldType,
      pluginParams,
      ctx.locale,
      ctx.currentUserAccessToken!,
      '1024x1024',
      fieldValue,
      ctx.alert,
      isImprove,
      {
        name: ctx.fields[field]!.attributes.label,
        apiKey: ctx.fields[field]!.attributes.api_key,
        validatiors: ctx.fields[field]!.attributes.validators
          ? JSON.stringify(ctx.fields[field]!.attributes.validators, null, 2)
          : null,
        hint: ctx.fields[field]!.attributes.hint
          ? JSON.stringify(ctx.fields[field]!.attributes.hint, null, 2)
          : null,
      },
      currentFormValues,
      null,
      null,
      fieldsetInfo,
      ctx.itemType.attributes.name
    );

    const fieldIsLocalized = ctx.fields[field]!.attributes.localized;

    console.log({
      generatedFieldValue,
      apikey: ctx.fields[field]!.attributes.api_key,
    });

    currentFormValues[ctx.fields[field]!.attributes.api_key] = fieldIsLocalized
      ? { [ctx.locale]: generatedFieldValue }
      : generatedFieldValue;

    ctx.setFieldValue(
      ctx.fields[field]!.attributes.api_key,
      fieldIsLocalized
        ? { [ctx.locale]: generatedFieldValue }
        : generatedFieldValue
    );
  }
}

function DatoGPTSidebar({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompts, setPrompts] = useState('');

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
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <ReactTextareaAutosize
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              name="prompts"
              id="prompts"
              placeholder="Prompt all fields"
              className={s.promptsTextarea}
            />
            <Button
              fullWidth
              onClick={() => {
                setIsLoading(true);
                generateAllFields(ctx, pluginParams, prompts, false).then(
                  () => {
                    setIsLoading(false);
                  }
                );
              }}
            >
              Generate all fields
            </Button>

            <Button
              fullWidth
              onClick={() => {
                setIsLoading(true);
                generateAllFields(ctx, pluginParams, prompts, true).then(() => {
                  setIsLoading(false);
                });
              }}
            >
              Improve all fields
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
              Generating...
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </Canvas>
  );
}

export default DatoGPTSidebar;
