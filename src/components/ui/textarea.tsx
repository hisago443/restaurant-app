import * as React from 'react';

import {cn} from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const textareaVariants = cva(
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
);

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>
>(({className, ...props}, ref) => {
  return (
    <textarea
      className={cn(textareaVariants({className}))}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export {Textarea, textareaVariants};