import { useState, useCallback } from 'react'
import { Upload, FileText, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface FileUploadDropzoneProps {
  onSuccess?: () => void
  onClose?: () => void
}

export default function FileUploadDropzone({ onSuccess, onClose }: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptedTypes = {
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  }

  const validateFile = (file: File): string | null => {
    const validTypes = Object.keys(acceptedTypes)
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, TXT, MD, or DOCX files only.'
    }
    
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return 'File size exceeds 100MB limit.'
    }
    
    return null
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setError(null)

    try {
      // Get current user (optional - supports anonymous uploads)
      const { data: { user } } = await supabase.auth.getUser()

      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('original_filename', selectedFile.name)

      // Call upload-file edge function
      const { data, error } = await supabase.functions.invoke('upload-file', {
        body: formData
      })

      if (error) {
        throw error
      }

      if (data?.error) {
        if (data.error.code === 'DUPLICATE_FILE') {
          setError('This file has already been uploaded.')
        } else {
          throw new Error(data.error.message)
        }
        return
      }

      setUploadSuccess(true)
      
      // Call onSuccess callback after a short delay
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 2000)

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setError(null)
    setUploadSuccess(false)
  }

  const getFileIcon = () => {
    if (!selectedFile) return <FileText size={24} />
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    return <FileText size={24} className={
      ext === 'pdf' ? 'text-red-400' :
      ext === 'docx' ? 'text-blue-400' :
      ext === 'md' ? 'text-purple-400' :
      'text-gray-400'
    } />
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-900/10'
            : 'border-gray-600 hover:border-gray-500'
        } ${selectedFile ? 'bg-gray-800/50' : ''}`}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              {getFileIcon()}
              <div className="text-left">
                <div className="text-white font-medium">{selectedFile.name}</div>
                <div className="text-sm text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              {!uploading && !uploadSuccess && (
                <button
                  onClick={clearSelection}
                  className="ml-auto text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload size={48} className="text-gray-400" />
            </div>
            <div>
              <p className="text-white font-medium mb-2">
                Drag and drop your file here
              </p>
              <p className="text-sm text-gray-400">
                or click to browse
              </p>
            </div>
            <input
              type="file"
              onChange={handleFileSelect}
              accept={Object.values(acceptedTypes).flat().join(',')}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
            >
              Select File
            </label>
            <p className="text-xs text-gray-500 mt-3">
              Supported formats: PDF, TXT, MD, DOCX (Max 100MB)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-300">
            File uploaded successfully! Processing will begin shortly.
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !uploadSuccess && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={20} />
              Upload Document
            </>
          )}
        </button>
      )}
    </div>
  )
}
