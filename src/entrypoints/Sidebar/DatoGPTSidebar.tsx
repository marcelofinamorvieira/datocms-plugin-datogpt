import { RenderItemFormSidebarPanelCtx } from 'datocms-plugin-sdk';
import { Button, Canvas, Spinner } from 'datocms-react-ui';
import { useState } from 'react';
import { ctxParamsType } from '../Config/ConfigScreen';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextareaAutosize from 'react-textarea-autosize';
import s from '../styles.module.css';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import { EditorType } from '../../types/editorTypes';

/**
 * This file defines the DatoGPTSidebar component, which appears as a sidebar panel
 * in the DatoCMS interface. It allows users to prompt AI generation or improvement
 * of all fields in the current record using a single prompt.
 *
 * Main responsibilities:
 * - Accept a prompt from the user.
 * - Trigger generation or improvement of all applicable fields in the record.
 * - Show loading states and provide feedback (spinner) while operations are in progress.
 */

/**
 * Subcomponent: PromptInputArea
 *
 * Renders a textarea for users to type a prompt for generation or improvement of all fields.
 * Uses ReactTextareaAutosize for a better UX as it grows with user input.
 *
 * Props:
 * - prompts: The current prompt string.
 * - setPrompts: Setter for updating the prompt string.
 */
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

/**
 * Subcomponent: GenerateButtons
 *
 * Displays two buttons: "Generate all fields" and "Improve all fields".
 * When clicked, they call the corresponding handlers passed from the parent.
 *
 * Props:
 * - handleGenerateAll: Callback to handle generating all fields.
 * - handleImproveAll: Callback to handle improving all fields.
 * - isLoading: Boolean indicating if an operation is in progress (disables buttons if true).
 */
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
        {isLoading ? 'Generating...' : 'Generate all fields'}
      </Button>

      <Button fullWidth onClick={handleImproveAll} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Improve all fields'}
      </Button>
    </>
  );
}

/**
 * Async function: generateAllFields
 *
 * Given a prompt and plugin parameters, this function attempts to generate or improve
 * all applicable fields in the current record using AI.
 *
 * It iterates over all fields, checks if they are eligible for generation or improvement,
 * and uses the generateFieldValue utility. After generation, it updates the field values
 * in the DatoCMS form.
 *
 * Parameters:
 * - ctx: The RenderItemFormSidebarPanelCtx from DatoCMS, providing current user access token and form values.
 * - pluginParams: Configuration parameters for the plugin, including API keys and model details.
 * - prompt: The user-provided prompt.
 * - isImprove: Boolean indicating if we are improving existing fields rather than creating new content.
 *
 * Note: This function modifies ctx.formValues and sets them via ctx.setFieldValue.
 */

async function generateAllFields(
  ctx: RenderItemFormSidebarPanelCtx,
  pluginParams: ctxParamsType,
  prompt: string,
  isImprove: boolean
) {
  // Sort fields by position for consistency:
  const fieldsObject = Object.entries(ctx.fields)
    .sort((a, b) => a[1]!.attributes.position - b[1]!.attributes.position)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  const currentFormValues = ctx.formValues;

  for (const field in fieldsObject) {
    const fieldType = ctx.fields[field]!.attributes.appearance.editor;
    const fieldValue = ctx.formValues[ctx.fields[field]!.attributes.api_key];

    // Determine if the field should be generated or improved:
    const shouldProcess =
      pluginParams.advancedSettings.generateValueFields.includes(
        fieldType as EditorType
      );

    // Skip fields not eligible for generation/improvement:
    if (!shouldProcess) continue;

    // Gather fieldset info if available:
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

    // Generate or improve the field's value:
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

    // Determine if the field is localized and set the value accordingly:
    const fieldIsLocalized = ctx.fields[field]!.attributes.localized;
    currentFormValues[ctx.fields[field]!.attributes.api_key] = fieldIsLocalized
      ? { [ctx.locale]: generatedFieldValue }
      : generatedFieldValue;

    // Update the field value in the CMS:
    ctx.setFieldValue(
      ctx.fields[field]!.attributes.api_key,
      fieldIsLocalized
        ? { [ctx.locale]: generatedFieldValue }
        : generatedFieldValue
    );
  }
}

/**
 * Main Component: DatoGPTSidebar
 *
 * Renders a sidebar panel with:
 * - A text area for the user to input a prompt.
 * - Two buttons to either generate all fields or improve all fields with AI.
 * - A loading state (spinner) while AI operations are running.
 *
 * Logic:
 * 1. If no API Key or GPT model is configured, it displays a warning message.
 * 2. Otherwise, it allows the user to enter a prompt and trigger generation/improvement.
 * 3. While generating/improving, a loading spinner is displayed.
 * 4. After completion, the spinner disappears and the user can interact again.
 *
 * State:
 * - prompts: The user-input prompt text.
 * - isLoading: Whether the generation/improvement is currently in progress.
 *
 * Props:
 * - ctx: The RenderItemFormSidebarPanelCtx provided by DatoCMS.
 */
function DatoGPTSidebar({ ctx }: { ctx: RenderItemFormSidebarPanelCtx }) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;

  // Local state:
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [prompts, setPrompts] = useState('');

  // Validate plugin configuration:
  if (!pluginParams.apiKey || !pluginParams.gptModel) {
    return <div>Please insert a valid API Key and select a GPT Model</div>;
  }

  /**
   * handleGenerateAll:
   * Trigger the generation of all fields. Sets loading state before starting and
   * resets it afterward.
   */
  const handleGenerateAll = () => {
    setIsLoading(true);
    generateAllFields(ctx, pluginParams, prompts, false).then(() => {
      setIsLoading(false);
    });
  };

  /**
   * handleImproveAll:
   * Trigger the improvement of all fields. Sets loading state before starting and
   * resets it afterward.
   */
  const handleImproveAll = () => {
    setIsLoading(true);
    generateAllFields(ctx, pluginParams, prompts, true).then(() => {
      setIsLoading(false);
    });
  };

  // Render the UI inside a Canvas (DatoCMS styling context):
  return (
    <Canvas ctx={ctx}>
      <AnimatePresence mode="wait">
        {!isLoading ? (
          // When not loading, show the prompt input and buttons.
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Prompt input area for user to type instructions */}
            <PromptInputArea prompts={prompts} setPrompts={setPrompts} />

            {/* Buttons to generate or improve all fields */}
            <GenerateButtons
              handleGenerateAll={handleGenerateAll}
              handleImproveAll={handleImproveAll}
              isLoading={isLoading}
            />
          </motion.div>
        ) : (
          // When loading, show a spinner and a "Generating..." message.
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
