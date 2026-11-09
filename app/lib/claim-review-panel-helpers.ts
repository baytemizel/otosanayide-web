export type Claim = {id: string; name: string; city: string; address: string; contactName: string; phone: string; note: string; reply: string; status: string; businessId: string | null; verificationReference: string | null};
export type Decision = 'approve' | 'request_information' | 'reject';
