import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Snippet {
  id: string;
  title: string;
  lang: string;
  tags: string[];
  lastModified: string;
  content: string;
  filename: string;
  path: string;
  creator: string;
}

@Component({
  selector: 'app-code-snippets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-snippets.component.html',
  styleUrl: './code-snippets.component.css'
})
export class CodeSnippetsComponent {
  activeLang = signal('Python');
  selectedSnippetId = signal('1');

  snippets: Snippet[] = [
    {
      id: '1',
      title: 'sso_auth_provider.py',
      lang: 'Python',
      tags: ['AUTH'],
      lastModified: '12m ago',
      filename: 'sso_auth_provider.py',
      path: '/infrastructure/auth/',
      creator: '@j.smith',
      content: `import boto3
from botocore.exceptions import ClientError
# AWS SSO Authentication Handler
class SSOAuthProvider:
    def __init__(self, region_name):
        self.region = region_name
        self.client = boto3.client('sso', region_name=region_name)

    def get_token(self):
        try:
            # Logic to retrieve cached token or initiate login
            return self.client.get_token()
        except ClientError as e:
            print(f"Error authenticating: {e}")
            raise`
    },
    {
      id: '2',
      title: 'data_migration_util.py',
      lang: 'Python',
      tags: ['DB'],
      lastModified: '2h ago',
      filename: 'data_migration_util.py',
      path: '/backend/utils/',
      creator: '@m.doe',
      content: `import pandas as pd
# Migration utility functions`
    },
  ];

  selectedSnippet = computed(() => {
    return this.snippets.find(s => s.id === this.selectedSnippetId()) || this.snippets[0];
  });

  getLineNumbers(content: string): number[] {
    return Array.from({ length: content.split('\n').length }, (_, i) => i + 1);
  }
}
