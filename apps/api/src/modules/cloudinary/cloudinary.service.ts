import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Issues signed upload credentials so the browser can push files directly to
 * Cloudinary without the API secret ever leaving the server. No multer, no
 * proxying file bytes through Nest.
 */
@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {}

  private assertConfigured(): {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  } {
    const cloudName = this.config.get<string>("CLOUDINARY_CLOUD_NAME");
    const apiKey = this.config.get<string>("CLOUDINARY_API_KEY");
    const apiSecret = this.config.get<string>("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException("Cloudinary is not configured");
    }
    return { cloudName, apiKey, apiSecret };
  }

  signUpload(params: { timestamp: number; folder: string }): UploadSignature {
    const { cloudName, apiKey, apiSecret } = this.assertConfigured();
    const signature = cloudinary.utils.api_sign_request(params, apiSecret);
    return {
      cloudName,
      apiKey,
      timestamp: params.timestamp,
      folder: params.folder,
      signature
    };
  }
}
