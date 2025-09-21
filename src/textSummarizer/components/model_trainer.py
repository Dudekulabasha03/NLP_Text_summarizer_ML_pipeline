from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from transformers import TrainingArguments, Trainer
from transformers import DataCollatorForSeq2Seq
import torch
from datasets import load_from_disk
import os
from src.textSummarizer.entity import ModelTrainerConfig

class ModelTrainer:
    def __init__(self, config: ModelTrainerConfig):
        self.config = config

    def train(self):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(self.config.model_ckpt, use_fast=False)
        model_pegasus = AutoModelForSeq2SeqLM.from_pretrained(self.config.model_ckpt).to(device)
        
        # Enable gradient checkpointing for memory efficiency
        if hasattr(model_pegasus, 'gradient_checkpointing_enable'):
            model_pegasus.gradient_checkpointing_enable()
        seq2seq_data_collator = DataCollatorForSeq2Seq(
            tokenizer, 
            model=model_pegasus,
            padding="max_length",
            max_length=512,
            return_tensors="pt"
        )

        #loading the data
        dataset_samsum_pt = load_from_disk(self.config.data_path)

        trainer_args = TrainingArguments(
            output_dir=self.config.root_dir, num_train_epochs=1, warmup_steps=500,
            per_device_train_batch_size=1, per_device_eval_batch_size=1,
            weight_decay=0.01, logging_steps=10,
            eval_strategy='steps', eval_steps=500, save_steps=1e6,
            gradient_accumulation_steps=64,  # Increased for better memory efficiency
            dataloader_pin_memory=False,  # Disable pin memory for MPS
            gradient_checkpointing=True,  # Enable gradient checkpointing to save memory
            remove_unused_columns=True,  # Remove unused columns to prevent tensor creation errors
            dataloader_num_workers=0,  # Disable multiprocessing for MPS compatibility
            report_to=None,  # Disable all integrations
            push_to_hub=False  # Disable hub integration
        ) 
        trainer = Trainer(
            model=model_pegasus, 
            args=trainer_args,
            tokenizer=tokenizer, 
            data_collator=seq2seq_data_collator,
            train_dataset=dataset_samsum_pt["test"],
            eval_dataset=dataset_samsum_pt["validation"],
            callbacks=[]  # Disable all callbacks
        )
        
        trainer.train()

        ## Save model
        model_pegasus.save_pretrained(os.path.join(self.config.root_dir,"pegasus-samsum-model"))
        ## Save tokenizer
        tokenizer.save_pretrained(os.path.join(self.config.root_dir,"tokenizer"))


