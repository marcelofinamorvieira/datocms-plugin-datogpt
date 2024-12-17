import { Field, RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextareaAutosize from 'react-textarea-autosize';
import s from '../styles.module.css';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import { EditorType } from '../../types/editorTypes';
import {
  textFieldTypes,
  translateFieldTypes,
} from '../Config/AdvancedSettings';
import { ChatBubbleGenerate } from '../../components/DatoGPTPrompt/messaging/ChatbubbleGenerate';

//-------------------------------------------
// Async function: generateAllFields
//
// Modified to accept callbacks onStart/onComplete to track field generation progress.
// Calls onStart before generating each field and onComplete after done.
//-------------------------------------------
async function generateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  prompt: string,
  isImprove: boolean,
  callbacks?: {
    onStart?: (fieldLabel: string, fieldPath: string) => void;
    onComplete?: (fieldLabel: string) => void;
  }
) {
  const modifiedPluginParams = { ...pluginParams };

  if (
    !modifiedPluginParams.advancedSettings.generateAssetsOnSidebarBulkGeneration
  ) {
    modifiedPluginParams.advancedSettings.seoGenerateAsset = false;
  }

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

    callbacks?.onStart?.(fieldItem.attributes.label, field);

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

    const fieldIsLocalized = fieldItem.attributes.localized;
    currentFormValues[field] = fieldIsLocalized
      ? { [ctx.locale]: generatedFieldValue }
      : generatedFieldValue;

    ctx.setFieldValue(
      fieldIsLocalized ? field + '.' + ctx.locale : field,
      generatedFieldValue
    );

    callbacks?.onComplete?.(fieldItem.attributes.label);
  }
}

//-------------------------------------------
// Internal helper component: PromptInputArea
//-------------------------------------------
function PromptInputArea({
  prompts,
  setPrompts,
}: {
  prompts: string;
  setPrompts: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <ReactTextareaAutosize
      value={prompts}
      onChange={(e) => setPrompts(e.target.value)}
      name="prompts"
      id="prompts"
      placeholder="Prompt all fields"
      className={s.promptsTextarea}
    />
  );
}

//-------------------------------------------
// Internal helper component: GenerateButtons
//-------------------------------------------
function GenerateButtons({
  handleGenerateAll,
  handleImproveAll,
  isLoading,
}: {
  handleGenerateAll: () => void;
  handleImproveAll: () => void;
  isLoading: boolean;
}) {
  return (
    <>
      <Button fullWidth onClick={handleGenerateAll} disabled={isLoading}>
        {'Generate all fields'}
      </Button>

      <Button fullWidth onClick={handleImproveAll} disabled={isLoading}>
        {'Improve all fields'}
      </Button>
    </>
  );
}

export default function DatoGPTSidebar({
  ctx,
}: {
  ctx: RenderItemFormSidebarPanelCtx;
}) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompts, setPrompts] = useState('');

  // New state for generation chat bubbles
  const [generationBubbles, setGenerationBubbles] = useState<
    { fieldLabel: string; status: 'pending' | 'done'; fieldPath: string }[]
  >([]);

  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  const handleGenerateAll = () => {
    setIsLoading(true);
    setGenerationBubbles([]);
    generateAllFields(ctx, pluginParams, prompts, false, {
      onStart: (fieldLabel, fieldPath) => {
        setGenerationBubbles((prev) => [
          ...prev,
          { fieldLabel, status: 'pending', fieldPath },
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
        ctx.notice('All fields generated successfully');
        setIsLoading(false);
      })
      .catch((error) => {
        ctx.alert(error.message || 'Unknown error');
        setIsLoading(false);
      });
  };

  const handleImproveAll = () => {
    setIsLoading(true);
    setGenerationBubbles([]);
    generateAllFields(ctx, pluginParams, prompts, true, {
      onStart: (fieldLabel, fieldPath) => {
        setGenerationBubbles((prev) => [
          ...prev,
          { fieldLabel, status: 'pending', fieldPath },
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
        ctx.notice('All fields improved successfully');
        setIsLoading(false);
      })
      .catch((error) => {
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
            <PromptInputArea prompts={prompts} setPrompts={setPrompts} />
            <GenerateButtons
              handleGenerateAll={handleGenerateAll}
              handleImproveAll={handleImproveAll}
              isLoading={isLoading}
            />
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
                    ctx.scrollToField(bubble.fieldPath, ctx.locale);
                  }}
                >
                  <ChatBubbleGenerate
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
