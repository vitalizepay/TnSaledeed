
export type FileKey = 'sampleDeed' | 'sellerDeed';

export interface UploadedFiles {
  sampleDeed: File | null;
  sellerAadhaars: File[];
  buyerAadhaars: File[];
  sellerDeed: File | null;
}

export interface FilePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}
