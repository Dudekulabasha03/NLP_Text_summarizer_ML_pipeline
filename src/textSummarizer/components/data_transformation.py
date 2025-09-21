import os
from src.textSummarizer.logging import logger
from transformers import AutoTokenizer
from datasets import load_from_disk

from src.textSummarizer.entity import DataTransformationConfig


class DataTransformation:
    def __init__(self,config:DataTransformationConfig):
        self.config=config
        self.tokenizer=AutoTokenizer.from_pretrained(config.tokenizer_name, use_fast=False)

    def convert_examples_to_features(self,example_batch):
        # For T5, we need to add task prefixes
        input_texts = [f"summarize: {dialogue}" for dialogue in example_batch['dialogue']]
        input_encodings = self.tokenizer(input_texts, max_length=1024, truncation=True, padding='max_length')

        target_encodings = self.tokenizer(example_batch['summary'], max_length=128, truncation=True, padding='max_length')

        return {
            'input_ids' : input_encodings['input_ids'],
            'attention_mask': input_encodings['attention_mask'],
            'labels': target_encodings['input_ids']
        }
    
    def convert(self):
        dataset_samsum = load_from_disk(self.config.data_path)
        dataset_samsum_pt = dataset_samsum.map(self.convert_examples_to_features, batched = True)
        dataset_samsum_pt.save_to_disk(os.path.join(self.config.root_dir,"samsum_dataset"))


    