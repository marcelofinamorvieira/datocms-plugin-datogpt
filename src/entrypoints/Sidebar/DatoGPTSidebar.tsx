//********************************************************************************************
// DatoGPTSidebar.tsx
//
// This file renders a sidebar panel in DatoCMS that allows users to generate or improve all fields
// at once using OpenAI, based on user prompts. It also displays a chat-like interface while processing.
//********************************************************************************************

import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextareaAutosize from 'react-textarea-autosize';
import s from '../styles.module.css';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import { EditorType } from '../../types/editorTypes';
import { ChatbubbleGenerate } from '../../components/DatoGPTPrompt/messaging/ChatbubbleGenerate';

//-------------------------------------------
// Async function: generateAllFields
//-------------------------------------------
// This function generates or improves all fields in the record depending on isImprove.
// It loops through all fields of the current model, filters out fields that shouldn't be processed,
// and calls generateFieldValue for each applicable field.
//
// Parameters:
// - ctx: sidebar panel context
// - pluginParams: configuration parameters
// - prompt: user prompt entered in the textarea
// - isImprove: boolean indicating if we are improving existing values (true) or generating new values (false)
// - callbacks: optional, onStart/onComplete callbacks for UI updates
//
// onStart(fieldLabel, fieldPath, isImprove): called before generating/improving a field
// onComplete(fieldLabel): called after generation/improvement finishes for a field
//
// This function ensures that after processing each field, the updated values are set in the CMS form.
async function generateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  prompt: string,
  isImprove: boolean,
  callbacks?: {
    onStart?: (
      fieldLabel: string,
      fieldPath: string,
      isImprove: boolean
    ) => void;
    onComplete?: (fieldLabel: string) => void;
  }
) {
  const modifiedPluginParams = { ...pluginParams };

  // If generateAssetsOnSidebarBulkGeneration is disabled, do not generate assets for SEO field:
  if (
    !modifiedPluginParams.advancedSettings.generateAssetsOnSidebarBulkGeneration
  ) {
    modifiedPluginParams.advancedSettings.seoGenerateAsset = false;
  }

  // Get all fields for the current model
  const fieldObjectForThisItemType = Object.fromEntries(
    Object.entries(ctx.fields).filter(
      ([_, field]) =>
        field?.relationships.item_type.data?.id === ctx.itemType.id
    )
  );

  const fieldsetForThisItemType = Object.fromEntries(
    Object.entries(ctx.fieldsets).filter(
      ([_, fieldset]) =>
        fieldset?.relationships.item_type.data?.id === ctx.itemType.id
    )
  );

  // orderFieldsByPosition: orders fields by their position and fieldsets if any, ensuring a stable generation order
  function orderFieldsByPosition(
    fields: Record<string, any>,
    fieldsets: Record<string, any>
  ): any[] {
    const NO_FIELDSET = 'NO_FIELDSET';

    const fieldsetsArr = Object.values(fieldsets).map((f: any) => ({
      id: f.id,
      position: f.attributes.position,
    }));

    const fieldsByFieldset: Record<string, any[]> = { [NO_FIELDSET]: [] };

    for (const f of Object.values(fields)) {
      const fsId = f.relationships?.fieldset?.data?.id || NO_FIELDSET;
      if (!fieldsByFieldset[fsId]) {
        fieldsByFieldset[fsId] = [];
      }
      fieldsByFieldset[fsId].push(f);
    }

    for (const fsId in fieldsByFieldset) {
      fieldsByFieldset[fsId].sort(
        (a, b) => a.attributes.position - b.attributes.position
      );
    }

    fieldsetsArr.sort((a, b) => a.position - b.position);

    const topLevelFields = fieldsByFieldset[NO_FIELDSET].map((field: any) => ({
      type: 'field',
      position: field.attributes.position,
      fields: [field],
    }));

    const topLevelFieldsets = fieldsetsArr.map((fs) => ({
      type: 'fieldset',
      position: fs.position,
      fields: fieldsByFieldset[fs.id] || [],
    }));

    const combined = [...topLevelFields, ...topLevelFieldsets].sort(
      (a, b) => a.position - b.position
    );

    const result: any[] = [];
    for (const item of combined) {
      for (const f of item.fields) {
        result.push(f);
      }
    }

    return result;
  }

  const fieldArray = orderFieldsByPosition(
    fieldObjectForThisItemType,
    fieldsetForThisItemType
  );

  const currentFormValues = ctx.formValues;

  for (const fieldItem of fieldArray) {
    const field = fieldItem.attributes.api_key;
    const fieldType = fieldItem.attributes.appearance.editor;
    const fieldValue = ctx.formValues[field];

    // Decide if we should process this field depending on field type and settings:
    const shouldProcess =
      modifiedPluginParams.advancedSettings.generateValueFields.includes(
        fieldType as EditorType
      ) ||
      ((fieldType === 'gallery' || fieldType === 'file') &&
        modifiedPluginParams.advancedSettings
          .generateAssetsOnSidebarBulkGeneration);

    if (!shouldProcess) continue;

    const fieldsetInfo = fieldItem.relationships.fieldset.data?.id
      ? {
          name:
            ctx.fieldsets[fieldItem.relationships.fieldset.data?.id]?.attributes
              .title ?? null,
          hint:
            ctx.fieldsets[fieldItem.relationships.fieldset.data?.id]?.attributes
              .hint ?? null,
        }
      : null;

    const fieldIsLocalized = fieldItem.attributes.localized;
    const fieldPath = fieldIsLocalized ? field + '.' + ctx.locale : field;

    // Notify the UI that we are starting on this field
    callbacks?.onStart?.(fieldItem.attributes.label, fieldPath, isImprove);

    // Generate or improve the field value
    const generatedFieldValue = await generateFieldValue(
      0,
      ctx.itemTypes,
      prompt,
      fieldType,
      modifiedPluginParams,
      ctx.locale,
      ctx.currentUserAccessToken!,
      '1024x1024',
      fieldValue,
      ctx.alert,
      isImprove,
      {
        name: fieldItem.attributes.label,
        apiKey: field,
        validatiors: fieldItem.attributes.validators
          ? JSON.stringify(fieldItem.attributes.validators, null, 2)
          : null,
        hint: fieldItem.attributes.hint
          ? JSON.stringify(fieldItem.attributes.hint, null, 2)
          : null,
      },
      currentFormValues,
      null,
      null,
      fieldsetInfo,
      ctx.itemType.attributes.name
    );

    currentFormValues[field] = fieldIsLocalized
      ? { [ctx.locale]: generatedFieldValue }
      : generatedFieldValue;

    ctx.setFieldValue(fieldPath, generatedFieldValue);

    // Notify the UI that we have completed this field
    callbacks?.onComplete?.(fieldItem.attributes.label);
  }
}

export default function DatoGPTSidebar({
  ctx,
}: {
  ctx: RenderItemFormSidebarPanelCtx;
}) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompts, setPrompts] = useState('');

  // generationBubbles array now also used for improvements
  // bubble now also includes isImprove to distinguish message displayed
  const [generationBubbles, setGenerationBubbles] = useState<
    {
      fieldLabel: string;
      status: 'pending' | 'done';
      fieldPath: string;
      isImprove: boolean;
    }[]
  >([]);

  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  const handleGenerateAll = () => {
    setIsLoading(true);
    setGenerationBubbles([]);
    generateAllFields(ctx, pluginParams, prompts, false, {
      onStart: (fieldLabel, fieldPath, isImprove) => {
        setGenerationBubbles((prev) => [
          ...prev,
          { fieldLabel, status: 'pending', fieldPath, isImprove },
        ]);
      },
      onComplete: (fieldLabel) => {
        setGenerationBubbles((prev) =>
          prev.map((bubble) =>
            bubble.fieldLabel === fieldLabel
              ? { ...bubble, status: 'done' }
              : bubble
          )
        );
      },
    })
      .then(() => {
        setPrompts('');
        ctx.notice('All fields generated successfully');
        setIsLoading(false);
      })
      .catch((error) => {
        setPrompts('');
        ctx.alert(error.message || 'Unknown error');
        setIsLoading(false);
      });
  };

  const handleImproveAll = () => {
    setIsLoading(true);
    setGenerationBubbles([]);
    generateAllFields(ctx, pluginParams, prompts, true, {
      onStart: (fieldLabel, fieldPath, isImprove) => {
        // Note: isImprove will be true here
        setGenerationBubbles((prev) => [
          ...prev,
          { fieldLabel, status: 'pending', fieldPath, isImprove },
        ]);
      },
      onComplete: (fieldLabel) => {
        setGenerationBubbles((prev) =>
          prev.map((bubble) =>
            bubble.fieldLabel === fieldLabel
              ? { ...bubble, status: 'done' }
              : bubble
          )
        );
      },
    })
      .then(() => {
        setPrompts('');
        ctx.notice('All fields improved successfully');
        setIsLoading(false);
      })
      .catch((error) => {
        setPrompts('');
        ctx.alert(error.message || 'Unknown error');
        setIsLoading(false);
      });
  };

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
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <ReactTextareaAutosize
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              name="prompts"
              id="prompts"
              placeholder="Prompt all fields"
              className={s.promptsTextarea}
            />
            <Button fullWidth onClick={handleGenerateAll} disabled={isLoading}>
              {'Generate all fields'}
            </Button>

            {/* Improve all fields button */}
            <Button fullWidth onClick={handleImproveAll} disabled={isLoading}>
              {'Improve all fields'}
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
              flexDirection: 'column',
              width: '100%',
              padding: '0 16px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {generationBubbles.map((bubble, index) => (
                <div
                  key={index}
                  onClick={() => {
                    ctx.scrollToField(bubble.fieldPath);
                  }}
                >
                  <ChatbubbleGenerate
                    index={index}
                    bubble={bubble}
                    theme={ctx.theme}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Canvas>
  );
}
