'use client';

import { useCallback, useState } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle, X, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label: string;
  description: string;
  onFileLoaded: (content: string, filename: string) => void;
  onLoadSample?: () => void;
  acceptedType: 'planned' | 'actual';
  sampleData?: string;
}

export function FileUpload({ label, description, onFileLoaded, onLoadSample, acceptedType, sampleData }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  const validateAndLoad = useCallback((content: string, filename: string) => {
    setError(null);
    try {
      JSON.parse(content);
      setFileName(filename);
      setSuccess(true);
      onFileLoaded(content, filename);
    } catch (e) {
      setError('Invalid JSON format');
    }
  }, [onFileLoaded]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.json')) {
        setError('Only JSON files are accepted');
        return;
      }
      try {
        const content = await file.text();
        validateAndLoad(content, file.name);
      } catch (e) {
        setError('Failed to read file');
      }
    },
    [validateAndLoad]
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextContent(e.target.value);
    setError(null);
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (textContent.trim()) {
      validateAndLoad(textContent.trim(), 'pasted-content.json');
    } else {
      setError('Please enter valid JSON');
    }
  }, [textContent, validateAndLoad]);

  const handleLoadSample = useCallback(() => {
    if (sampleData) {
      validateAndLoad(sampleData, 'sample-data.json');
      if (onLoadSample) {
        onLoadSample();
      }
    }
  }, [sampleData, validateAndLoad, onLoadSample]);

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
    setTextContent('');
  }, []);

  return (
    <Card className={cn('transition-all', isDragging && 'border-primary')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            {label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {sampleData && (
              <Button variant="outline" size="sm" onClick={handleLoadSample}>
                <Copy className="h-3 w-3 mr-1" />
                Load Sample
              </Button>
            )}
            <label htmlFor={`file-upload-${acceptedType}`}>
              <input
                type="file"
                accept=".json"
                onChange={handleInputChange}
                className="hidden"
                id={`file-upload-${acceptedType}`}
              />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </span>
              </Button>
            </label>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste JSON
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors min-h-[120px] flex items-center justify-center',
                isDragging && 'border-primary bg-primary/5',
                error && !fileName && 'border-red-500',
                success && fileName && 'border-green-500'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{description}</p>
                  <p className="text-xs text-muted-foreground">or drag and drop JSON file here</p>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full max-w-xs">
                  <div className="flex items-center gap-2">
                    {success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : error ? (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <FileJson className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
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
          </TabsContent>

          <TabsContent value="paste">
            <div className="space-y-3">
              <textarea
                value={textContent}
                onChange={handleTextChange}
                placeholder={`Paste your ${acceptedType} state JSON here...`}
                className="w-full h-32 p-3 text-sm font-mono bg-muted/50 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setTextContent('')}>
                  Clear
                </Button>
                <Button size="sm" onClick={handleTextSubmit}>
                  Apply JSON
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
