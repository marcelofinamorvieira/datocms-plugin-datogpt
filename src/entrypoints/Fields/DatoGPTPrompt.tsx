import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { Canvas } from 'datocms-react-ui';
import { useState } from 'react';
import s from '../styles.module.css';
import { AiOutlineOpenAI } from 'react-icons/ai';
import classNames from 'classnames';
import { ctxParamsType } from '../Config/ConfigScreen';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import DefaultOptions from '../../components/DatoGPTPrompt/options/DefaultOptions';
import DefaultPrompting from '../../components/DatoGPTPrompt/prompting/DefaultPrompting';
import MediaOptions from '../../components/DatoGPTPrompt/options/MediaOptions';
import MediaPrompting from '../../components/DatoGPTPrompt/prompting/MediaPrompting';
import {
  availableResolutions,
  Upload,
} from '../../utils/generate/asset/generateUploadOnPrompt';
import ModularContentOptions from '../../components/DatoGPTPrompt/options/ModularContentOptions';
import ModularContentPrompting from '../../components/DatoGPTPrompt/prompting/ModularContentPrompting';
import {
  textFieldTypes,
  translateFieldTypes,
} from '../Config/AdvancedSettings';
import { fieldsThatDontNeedTranslation } from '../../utils/TranslateField';

type PropTypes = {
  ctx: RenderFieldExtensionCtx;
};

export const availableResolutionsArray: availableResolutions[] = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '256x256',
  '512x512',
];

/**
 * -------------------------------------------------------------------------------------------
 * DatoGPTPrompt Component
 *
 * This component adds a UI overlay to a DatoCMS field, allowing the user to:
 * - Prompt the AI to generate a new value for the field.
 * - Improve an existing value.
 * - Translate values across locales.
 * - Generate or improve media (images) if the field is a file or gallery.
 *
 * States:
 * - "collapsed": The default, minimal state showing only the AI icon button.
 * - "options": Shows action buttons relevant to the field type (e.g. generate new value, improve value, translate, etc.).
 * - "prompting" or "prompting-improve": Shows an input form allowing the user to provide a custom prompt to the AI.
 *
 * The exact options and prompting UI differ depending on:
 * - The field type (text, structured text, media).
 * - The localization setup (multiple locales or not).
 * - The plugin configuration (which fields support generation, improvement, translation).
 * -------------------------------------------------------------------------------------------
 */

/**
 * -------------------------------------------------------------------------------------------
 * DatoGPTPromptOptions Component (Internal)
 *
 * This sub-component is responsible for rendering the "options" state of the DatoGPTPrompt UI.
 * Depending on the field type and plugin configuration, it displays different sets of action
 * buttons (e.g., "Prompt to generate new value", "Improve current value", "Translate", etc.).
 *
 * Props:
 * - setViewState: function to update the main component state (e.g. switching from options to prompting)
 * - ctx: The field extension context from DatoCMS, providing field metadata and methods.
 * - pluginParams: The plugin configuration parameters including API keys and model info.
 * - controls: Animation controls for the icon rotation/loading animations.
 * - fieldValue: The current value of the field.
 *
 * This component returns nothing if no options apply to the current field, ensuring a clean UI.
 * -------------------------------------------------------------------------------------------
 */
function DatoGPTPromptOptions({
  viewState,
  setViewState,
  ctx,
  pluginParams,
  controls,
  fieldValue,
}: {
  viewState: string;
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  pluginParams: ctxParamsType;
  controls: ReturnType<typeof useAnimation>;
  fieldValue: unknown;
}) {
  const fieldType = ctx.field.attributes.appearance.editor;

  // Render only if we are in "options" state
  if (viewState !== 'options') return null;

  // For file or gallery fields, show MediaOptions
  if (fieldType === 'file' || fieldType === 'gallery') {
    return (
      <MediaOptions
        setViewState={setViewState}
        ctx={ctx}
        fieldValue={fieldValue}
        pluginParams={pluginParams}
        controls={controls}
      />
    );
  }

  // For structured text fields (rich_text), show ModularContentOptions
  if (fieldType === 'rich_text') {
    return (
      <ModularContentOptions
        setViewState={setViewState}
        ctx={ctx}
        fieldValue={fieldValue}
        pluginParams={pluginParams}
        controls={controls}
      />
    );
  }

  // For other field types (text fields, etc.), show DefaultOptions
  return (
    <DefaultOptions
      setViewState={setViewState}
      ctx={ctx}
      fieldValue={fieldValue}
      pluginParams={pluginParams}
      controls={controls}
    />
  );
}

/**
 * -------------------------------------------------------------------------------------------
 * DatoGPTPromptPrompting Component (Internal)
 *
 * This sub-component handles the "prompting" states ("prompting" and "prompting-improve").
 * It displays a text input for the user to write a prompt and a button to generate/improve
 * the field value based on the AI output.
 *
 * Depending on the field type, it chooses the appropriate prompting UI:
 * - For file/gallery: use MediaPrompting (which includes resolution selection).
 * - For rich_text: use ModularContentPrompting (which includes block type selection).
 * - For other text fields: use DefaultPrompting (simple text input and a prompt button).
 *
 * Props:
 * - viewState: either "prompting" or "prompting-improve"
 * - prompt: the current user-entered prompt text
 * - setPrompt: function to update the prompt state
 * - handleGeneratePrompt: function to actually perform the field value generation
 * - ctx: DatoCMS field extension context
 * - selectedResolution: the selected resolution for image generation (only used for media)
 * - setSelectedResolution: setter for resolution (only used for media)
 * -------------------------------------------------------------------------------------------
 */
function DatoGPTPromptPrompting({
  viewState,
  prompt,
  setPrompt,
  handleGeneratePrompt,
  ctx,
  selectedResolution,
  setSelectedResolution,
}: {
  viewState: string;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleGeneratePrompt: (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => void;
  ctx: RenderFieldExtensionCtx;
  selectedResolution: availableResolutions;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
}) {
  const fieldType = ctx.field.attributes.appearance.editor;

  // Determine if we are improving or just generating
  const isImprove = viewState === 'prompting-improve';

  // Show the correct prompting UI based on field type
  if (
    (viewState === 'prompting' || viewState === 'prompting-improve') &&
    (fieldType === 'file' || fieldType === 'gallery')
  ) {
    // Media fields: show MediaPrompting
    return (
      <MediaPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        selectedResolution={selectedResolution}
        setSelectedResolution={setSelectedResolution}
      />
    );
  }

  if (
    (viewState === 'prompting' || viewState === 'prompting-improve') &&
    fieldType === 'rich_text'
  ) {
    // Rich text fields: show ModularContentPrompting
    return (
      <ModularContentPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        isImprove={isImprove}
        ctx={ctx}
      />
    );
  }

  // Default text fields: show DefaultPrompting
  if (viewState === 'prompting' || viewState === 'prompting-improve') {
    return (
      <DefaultPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        isImprove={isImprove}
      />
    );
  }

  return null;
}

/**
 * -------------------------------------------------------------------------------------------
 * Main DatoGPTPrompt Component
 *
 * Responsibilities:
 * - Determine which UI to show based on the current state (collapsed, options, prompting).
 * - Handle the toggle between states when the AI icon is clicked.
 * - Manage animations and loading states while the AI processes requests.
 * - Invoke generateFieldValue utility when the user triggers prompt generation or improvement.
 *
 * Steps:
 * 1. Check plugin and field configurations to ensure functionality and that at least one action applies.
 * 2. Render the main icon and handle click events to toggle states.
 * 3. Conditionally render either the "options" sub-component or the "prompting" sub-component based on state.
 *
 * Variables:
 * - viewState: "collapsed", "options", "prompting", or "prompting-improve"
 * - prompt: user-entered text prompt for generation
 * - selectedResolution: chosen resolution for generating images in media fields
 * - isSpinning: controls icon spin animation
 * - controls: framer-motion controls for rotating the icon
 *
 * On prompt submit:
 * - Disables the field
 * - Starts a loading spinner
 * - Calls generateFieldValue and updates the field's value with the AI-generated result
 * - Re-enables the field and stops the spinner after completion
 * -------------------------------------------------------------------------------------------
 */
export default function DatoGPTPrompt({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const fieldType = ctx.field.attributes.appearance.editor;
  const fieldValue = ctx.formValues[ctx.field.attributes.api_key];

  // Animation controls for the icon
  const controls = useAnimation();

  // Internal state management
  const [viewState, setViewState] = useState('collapsed');
  const [isSpinning, setIsSpinning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');

  // If plugin is not properly configured, show a message
  if (
    !pluginParams ||
    !pluginParams.gptModel ||
    pluginParams.gptModel === 'None'
  ) {
    return <>Please insert a valid API Key and select a GPT Model</>;
  }

  /**
   * Function: toggleOptions
   * Toggles between collapsed and options states when the icon is clicked.
   */
  const toggleOptions = () => {
    if (viewState === 'collapsed') {
      setViewState('options');
    } else {
      setViewState('collapsed');
    }
  };

  /**
   * Function: handleLogoClick
   * Called when the AI icon is clicked. Rotates the icon and toggles the options.
   */
  const handleLogoClick = () => {
    if (!isSpinning) {
      controls.start({ rotate: 180 });
    } else {
      controls.start({ rotate: 0 });
    }
    setIsSpinning(!isSpinning);
    toggleOptions();
  };

  /**
   * Function: handleGeneratePrompt
   * Called when the user submits a prompt to generate/improve the field value.
   * Disables the field and shows a loading spinner, then calls generateFieldValue.
   */
  const handleGeneratePrompt = (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => {
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

    const fieldsetInfo = ctx.field.relationships.fieldset.data?.id
      ? {
          name:
            ctx.fieldsets[ctx.field.relationships.fieldset.data?.id]?.attributes
              .title ?? null,
          hint:
            ctx.fieldsets[ctx.field.relationships.fieldset.data?.id]?.attributes
              .hint ?? null,
        }
      : null;

    const isImprove = viewState === 'prompting-improve';

    generateFieldValue(
      0,
      ctx.itemTypes,
      prompt,
      fieldType,
      pluginParams,
      ctx.locale,
      ctx.currentUserAccessToken!,
      selectedResolution,
      fieldValue,
      ctx.alert,
      isImprove,
      {
        name: ctx.field.attributes.label,
        apiKey: ctx.field.attributes.api_key,
        validatiors: ctx.field.attributes.validators
          ? JSON.stringify(ctx.field.attributes.validators, null, 2)
          : null,
        hint: ctx.field.attributes.hint
          ? JSON.stringify(ctx.field.attributes.hint, null, 2)
          : null,
      },
      ctx.formValues,
      blockType ?? null,
      null,
      fieldsetInfo,
      ctx.itemType.attributes.name
    )
      .then((result) => {
        ctx.setFieldValue(ctx.fieldPath, result);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
      })
      .catch((error) => {
        ctx.alert(error);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
      });
  };

  /**
   * Conditional rendering:
   * - If there are no applicable actions for this field, return empty.
   * - Otherwise, show the main UI with the icon and either options or prompting states.
   */

  // Check conditions to ensure there's at least one action (generate/improve/translate) applicable
  // If no action applies, return empty to avoid cluttering the UI.
  // These checks replicate logic from the original code to ensure nothing breaks.
  // For brevity, we trust existing logic and conditions as is.

  // ... [Keep existing conditions from original code, unchanged, ensuring functionality remains intact] ...
  {
    // The original code checks multiple conditions to hide the UI if no actions apply.
    // We keep that logic intact. The checks are large and mostly about whether fields are empty
    // or if pluginParams allow operations on this field type.
    // Since no instructions were given to remove or alter these conditions, we trust them as is.

    let isEmptyStructuredText =
      fieldType === 'structured_text' &&
      Array.isArray(fieldValue) &&
      fieldValue.length === 1 &&
      typeof fieldValue[0] === 'object' &&
      fieldValue[0] !== null &&
      'type' in fieldValue[0] &&
      fieldValue[0].type === 'paragraph' &&
      fieldValue[0].children.length === 1 &&
      fieldValue[0].children[0].text === '';

    let hasFieldValueInThisLocale = !!fieldValue && !isEmptyStructuredText;

    const hasOtherLocales =
      Array.isArray(ctx.formValues.internalLocales) &&
      ctx.formValues.internalLocales.length > 1;

    const isLocalized = !!(
      !fieldsThatDontNeedTranslation.includes(fieldType) &&
      hasOtherLocales &&
      !ctx.parentField &&
      fieldValue &&
      typeof fieldValue === 'object' &&
      !Array.isArray(fieldValue) &&
      (fieldValue as Record<string, unknown>)[
        (ctx.formValues.internalLocales as string[])[0]
      ]
    );

    if (
      fieldValue &&
      typeof fieldValue === 'object' &&
      !Array.isArray(fieldValue) &&
      ctx.locale in (fieldValue as Record<string, unknown>)
    ) {
      const fieldValueInThisLocale = (fieldValue as Record<string, unknown>)[
        ctx.locale
      ];

      isEmptyStructuredText =
        fieldType === 'structured_text' &&
        Array.isArray(fieldValueInThisLocale) &&
        fieldValueInThisLocale.length === 1 &&
        typeof fieldValueInThisLocale[0] === 'object' &&
        fieldValueInThisLocale[0] !== null &&
        'type' in fieldValueInThisLocale[0] &&
        fieldValueInThisLocale[0].type === 'paragraph' &&
        fieldValueInThisLocale[0].children.length === 1 &&
        fieldValueInThisLocale[0].children[0].text === '';

      hasFieldValueInThisLocale =
        !!fieldValueInThisLocale && !isEmptyStructuredText;
    }

    // If conditions to show/hide the UI fail, return nothing
    // (These conditions remain as in the original code, ensuring no functional changes)
    if (
      ((fieldType === 'file' || fieldType === 'gallery') &&
        !pluginParams.advancedSettings.mediaFieldsPermissions &&
        !pluginParams.advancedSettings.generateAlts) ||
      (!(
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          (fieldValue as Upload)?.upload_id) ||
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload)
            ?.upload_id) ||
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload[])
            ?.length > 0) ||
        (Array.isArray(fieldValue) && fieldValue.length > 0)
      ) &&
        !pluginParams.advancedSettings.mediaFieldsPermissions)
    ) {
      return <></>;
    }

    if (
      !(
        fieldType === 'file' ||
        fieldType === 'gallery' ||
        fieldType === 'rich_text'
      ) &&
      !pluginParams.advancedSettings.generateValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) &&
      !pluginParams.advancedSettings.improveValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) &&
      !pluginParams.advancedSettings.translationFields.includes(
        fieldType as keyof typeof translateFieldTypes
      )
    ) {
      return <></>;
    }

    if (
      !(
        fieldType === 'file' ||
        fieldType === 'gallery' ||
        fieldType === 'rich_text'
      ) &&
      !pluginParams.advancedSettings.generateValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) &&
      !hasFieldValueInThisLocale
    ) {
      return <></>;
    }

    if (
      !(
        fieldType === 'file' ||
        fieldType === 'gallery' ||
        fieldType === 'rich_text'
      ) &&
      !pluginParams.advancedSettings.generateValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) &&
      !pluginParams.advancedSettings.improveValueFields.includes(
        fieldType as keyof typeof textFieldTypes
      ) &&
      !isLocalized
    ) {
      return <></>;
    }
  }

  // Render the main UI with icon and conditional panels
  return (
    <Canvas ctx={ctx}>
      <div className={classNames(s.optionContainer)}>
        {/* AnimatePresence handles the fade-in/out of components */}
        <AnimatePresence>
          {/* The Options panel */}
          <DatoGPTPromptOptions
            viewState={viewState}
            setViewState={setViewState}
            ctx={ctx}
            pluginParams={pluginParams}
            controls={controls}
            fieldValue={fieldValue}
          />
        </AnimatePresence>

        <AnimatePresence>
          {/* The Prompting panel (if viewState is prompting or prompting-improve) */}
          <DatoGPTPromptPrompting
            viewState={viewState}
            prompt={prompt}
            setPrompt={setPrompt}
            handleGeneratePrompt={handleGeneratePrompt}
            ctx={ctx}
            selectedResolution={selectedResolution}
            setSelectedResolution={setSelectedResolution}
          />
        </AnimatePresence>

        {/* The main icon button that toggles states */}
        <span className={classNames(s.gptOptions)}>
          <motion.div
            animate={controls}
            transition={{ duration: 0.5 }}
            onClick={handleLogoClick}
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformOrigin: 'center',
            }}
          >
            <AiOutlineOpenAI size={20} />
          </motion.div>
        </span>
      </div>
    </Canvas>
  );
}
