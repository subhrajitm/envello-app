import { InjectionToken } from '@angular/core';
import { IFileSystem } from '@envello/domain';

export const FILE_SYSTEM = new InjectionToken<IFileSystem>('FILE_SYSTEM');
