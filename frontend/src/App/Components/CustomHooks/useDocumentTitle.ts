import { useEffect } from 'react';
import { APP_NAME } from '../../Constants/variableConstant';

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
