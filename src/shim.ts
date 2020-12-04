// https://github.com/jfromaniello/selfsigned

declare module 'selfsigned' {
  export interface SelfsignedOptions {
    attrs?: any
    keySize?: number,
    days?: number,
    algorithm?: string,
    extensions?: any[],
    pkcs7?: boolean,
    clientCertificate?: undefined,
    clientCertificateCN?: string
  }

  export interface GenerateResult { private: string, public: string, cert: string }

  export function generate(attrs?: any, opts?: SelfsignedOptions, cb?: (err: undefined | Error, result: GenerateResult) => any): any
}
