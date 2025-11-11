import { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { FileText, Upload, Eye, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  type: string;
  name: string;
  uploadDate: string;
  expiryDate?: string;
  status: 'valid' | 'expiring' | 'expired';
  fileUrl?: string;
}

const mockDocuments: Document[] = [
  {
    id: 'DOC001',
    type: 'Driver License',
    name: 'TX-DL-123456789',
    uploadDate: 'Jan 15, 2024',
    expiryDate: 'Dec 31, 2026',
    status: 'valid',
  },
  {
    id: 'DOC002',
    type: 'Insurance',
    name: 'Vehicle Insurance Certificate',
    uploadDate: 'Mar 1, 2024',
    expiryDate: 'Nov 30, 2025',
    status: 'expiring',
  },
  {
    id: 'DOC003',
    type: 'ID Card',
    name: 'National ID',
    uploadDate: 'Jan 15, 2024',
    expiryDate: 'Jan 15, 2030',
    status: 'valid',
  },
];

export function DocumentsTab() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`${file.name} uploaded successfully`);
      setIsUploadOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      setDocuments(docs => docs.filter(d => d.id !== id));
      toast.success('Document deleted');
    }
  };

  const getStatusBadge = (status: string, expiryDate?: string) => {
    if (status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (status === 'expiring') {
      return (
        <Badge className="bg-orange-500 text-white">
          Expiring Soon
        </Badge>
      );
    }
    return <Badge className="bg-green-500 text-white">Valid</Badge>;
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Upload Button */}
      <Button
        onClick={() => setIsUploadOpen(true)}
        className="w-full bg-[#29CA8D] hover:bg-[#24b67d]"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload Document
      </Button>

      {/* Alert for Expiring Documents */}
      {documents.some(d => d.status === 'expiring' || d.status === 'expired') && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <div className="text-sm text-orange-900 mb-1">Action Required</div>
                <div className="text-xs text-orange-700">
                  You have {documents.filter(d => d.status === 'expiring' || d.status === 'expired').length} document(s) 
                  that need attention. Please update them to continue accepting trips.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const daysUntilExpiry = doc.expiryDate ? getDaysUntilExpiry(doc.expiryDate) : null;
          
          return (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-base text-gray-900 mb-1">{doc.type}</div>
                      <div className="text-sm text-gray-600">{doc.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Uploaded: {doc.uploadDate}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(doc.status, doc.expiryDate)}
                </div>

                {doc.expiryDate && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className={`${
                        doc.status === 'expired' ? 'text-red-600' :
                        doc.status === 'expiring' ? 'text-orange-600' :
                        'text-gray-900'
                      }`}>
                        {doc.expiryDate}
                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 90 && (
                          <span className="text-xs ml-2">
                            ({daysUntilExpiry} days left)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Select a document type and upload the file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['Driver License', 'Insurance', 'ID Card', 'Medical Certificate'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    selectedType === type
                      ? 'border-[#29CA8D] bg-[#29CA8D]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {selectedType && (
              <div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-32 border-2 border-dashed"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-600">Click to upload {selectedType}</div>
                    <div className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</div>
                  </div>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
