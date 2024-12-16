import { motion } from 'framer-motion';
import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  TextField,
} from 'datocms-react-ui';
import React, { useState } from 'react';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';

////////////////////////////////////////////////////////////////////////////////
// ModularContentPrompting Component File
//
// This file provides a user interface for prompting the generation or improvement
// of modular content (i.e., structured or rich text fields that can contain multiple
// blocks). The user can input a prompt and optionally select a specific block type
// to guide the generation.
//
// Breakdown:
// - ModularContentPrompting: The main component orchestrating the UI.
// - PromptInput: A sub-component for the prompt text input and prompt button.
// - BlockTypeSelector: A sub-component for selecting which block type(s) to generate.
//
// The user can choose "Auto-select block types from prompt" or a specific block
// type from the available options. Pressing "Prompt" triggers the generation.
//
// PROPS:
// handleGeneratePrompt: Callback for generating the content when user presses the button.
// prompt: Current prompt text.
// setPrompt: Setter for updating the prompt text.
// isImprove: Boolean indicating if we are improving an existing value or generating new content.
// ctx: DatoCMS field extension context used to get block model info.
////////////////////////////////////////////////////////////////////////////////

type PropTypes = {
  handleGeneratePrompt: (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  isImprove: boolean;
  ctx: RenderFieldExtensionCtx;
};

////////////////////////////////////////////////////////////////////////////////
// PromptInput Component
//
// Handles the user input for the prompt and the submission button.
//
// Responsibilities:
// - Render a TextField for typing the prompt.
// - Render a "Prompt" button to initiate generation.
// - On Enter key, triggers prompt generation.
//
// By isolating this logic, we reduce complexity in the parent component.
////////////////////////////////////////////////////////////////////////////////
function PromptInput({
  prompt,
  setPrompt,
  handleGeneratePrompt,
}: {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleGeneratePrompt: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ display: 'flex', gap: '4px', width: '100%' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleGeneratePrompt();
      }}
    >
      {/* TextField for user prompt input */}
      <TextField
        name="prompt"
        id="prompt"
        label=""
        value={prompt}
        placeholder="Write a prompt"
        onChange={(newValue) => setPrompt(newValue)}
      />

      {/* Button to trigger prompt generation */}
      <Button
        onClick={() => {
          handleGeneratePrompt();
        }}
        buttonSize="xxs"
        buttonType="muted"
      >
        Prompt
      </Button>
    </motion.div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// BlockTypeSelector Component
//
// Allows user to select a specific block type for generation or choose the
// "auto_select_gpt_plugin" option that lets the plugin decide based on the prompt.
//
// Responsibilities:
// - Display a dropdown with available block types plus the auto-select option.
// - Update the selected block type when user chooses a new one.
////////////////////////////////////////////////////////////////////////////////
function BlockTypeSelector({
  availableOptions,
  selectedBlockType,
  setSelectedBlockType,
}: {
  availableOptions: { name: string; apiKey: string; blockModelId: string }[];
  selectedBlockType: { name: string; apiKey: string; blockModelId: string };
  setSelectedBlockType: React.Dispatch<
    React.SetStateAction<{ name: string; apiKey: string; blockModelId: string }>
  >;
}) {
  return (
    <div style={{ height: '100%', fontSize: 'medium' }}>
      <Dropdown
        renderTrigger={({ open, onClick }) => (
          <Button
            onClick={onClick}
            rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
          >
            {selectedBlockType?.name || 'Select a block type'}
          </Button>
        )}
      >
        <DropdownMenu>
          {availableOptions.map((blockType) => (
            <DropdownOption
              key={blockType.apiKey}
              onClick={() => {
                setSelectedBlockType(blockType);
              }}
            >
              {blockType.name}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// ModularContentPrompting Component
//
// The main component that:
// - Retrieves block types from ctx.field attributes.
// - Allows the user to pick "Auto-select block types" or a specific block type.
// - Renders a prompt input field and a "Prompt" button.
//
// On submission, it calls `handleGeneratePrompt` with the selected block type
// data, enabling context-aware generation.
//
// Steps:
// 1. Retrieve available block types from validators.
// 2. Add the auto-select option at the start of the list.
// 3. Allow user to pick from these options.
// 4. PromptInput and BlockTypeSelector sub-components render their respective parts.
// 5. Pressing Enter or clicking Prompt triggers content generation.
////////////////////////////////////////////////////////////////////////////////
const ModularContentPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  isImprove,
  ctx,
}: PropTypes) => {
  // Extract available block types from the field's validators
  const availableBlockTypesIds = (
    ctx.field.attributes.validators.rich_text_blocks as Record<string, string[]>
  ).item_types;

  const availableOptions = availableBlockTypesIds.map((id) => {
    return {
      name: ctx.itemTypes[id]!.attributes.name!,
      apiKey: ctx.itemTypes[id]!.attributes.api_key!,
      blockModelId: ctx.itemTypes[id]!.id!,
    };
  });

  // Insert auto-select at the beginning
  availableOptions.unshift({
    name: 'Auto-select block types from prompt',
    apiKey: 'auto_select_gpt_plugin',
    blockModelId: 'auto_select_gpt_plugin',
  });

  const [selectedBlockType, setSelectedBlockType] = useState(
    availableOptions[0]
  );

  return (
    <motion.div
      // Animate component transitions
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        width: '100%',
      }}
    >
      {/* Prompt input area */}
      <PromptInput
        prompt={prompt}
        setPrompt={setPrompt}
        handleGeneratePrompt={() =>
          handleGeneratePrompt({
            name: selectedBlockType.name,
            apiKey: selectedBlockType.apiKey,
            blockModelId: selectedBlockType.blockModelId,
            blockLevel: 0,
            availableBlocks: availableBlockTypesIds,
          })
        }
      />

      {/* Block type selection dropdown */}
      <BlockTypeSelector
        availableOptions={availableOptions}
        selectedBlockType={selectedBlockType}
        setSelectedBlockType={setSelectedBlockType}
      />
    </motion.div>
  );
};

export default ModularContentPrompting;
