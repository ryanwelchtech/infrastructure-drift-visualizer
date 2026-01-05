'use client';

import { useCallback, useState } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  description: string;
  onFileLoaded: (content: string, filename: string) => void;
  acceptedType: 'planned' | 'actual';
}

export function FileUpload({ label, description, onFileLoaded, acceptedType }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Only JSON files are accepted');
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSuccess(false);

      if (!validateFile(file)) {
        return;
      }

      try {
        const content = await file.text();
        JSON.parse(content);
        setFileName(file.name);
        setSuccess(true);
        onFileLoaded(content, file.name);
      } catch (e) {
        setError('Invalid JSON format');
      }
    },
    [validateFile, onFileLoaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFileName(null);
    setSuccess(false);
    setError(null);
  }, []);

  return (
    <Card className={cn('transition-all', isDragging && 'border-primary')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging && 'border-primary bg-primary/5',
            error && 'border-red-500',
            success && 'border-green-500'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleInputChange}
            className="hidden"
            id={`file-upload-${acceptedType}`}
          />

          {!fileName ? (
            <label
              htmlFor={`file-upload-${acceptedType}`}
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground">or drag and drop JSON file here</p>
            </label>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : error ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <FileJson className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                {success && (
                  <Badge variant="healthy" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Valid
                  </Badge>
                )}
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
