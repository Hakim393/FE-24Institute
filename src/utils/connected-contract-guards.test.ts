import test from 'node:test';
import assert from 'node:assert/strict';
import { requireNotificationRead, requireNotificationsReadAll, requireCertificateTransition,
 requireCertificateRequest, normalizeMediaUpload, requirePdfBlob } from './connected-contract-guards';

test('read single notification checks matching id, isRead, changed', () => {
  assert.doesNotThrow(() => requireNotificationRead({success:true,data:{id:'x',isRead:true,changed:false}},'x'));
  assert.throws(() => requireNotificationRead({success:true,data:{id:'y',isRead:true,changed:true}},'x'));
  assert.throws(() => requireNotificationRead({success:true},'x'));
});
test('read-all respects markedRead=0 as valid and rejects legacy allRead', () => {
  assert.equal(requireNotificationsReadAll({success:true,data:{markedRead:0}}),0);
  assert.throws(() => requireNotificationsReadAll({success:true,data:{allRead:true}}));
  assert.throws(() => requireNotificationsReadAll({success:true,data:{markedRead:-1}}));
});
test('certificate review/issue/revoke require exact id and status', () => {
  requireCertificateTransition({success:true,data:{id:'c',status:'ISSUED',fileGenerated:false}},'c','ISSUED');
  assert.throws(() => requireCertificateTransition({success:true,data:{id:'c',status:'ELIGIBLE'}},'c','ISSUED'));
  assert.throws(() => requireCertificateTransition({success:true,data:{id:'other',status:'REVOKED'}},'c','REVOKED'));
});
test('certificate request validates server confirmation rather than envelope', () => {
  assert.equal(requireCertificateRequest({success:true,data:{id:'x',status:'PROCESSING',issuerName:'24Institute',existing:false,issued:false}}).status,'PROCESSING');
  assert.throws(() => requireCertificateRequest({success:true,data:{id:'x',status:'PROCESSING'}}));
});
test('media upload consumes data.media.secureUrl and rejects legacy shallow URL', () => {
  assert.deepEqual(normalizeMediaUpload({success:true,data:{media:{id:'m',secureUrl:'https://res.cloudinary.com/x.jpg'}}}),{mediaId:'m',url:'https://res.cloudinary.com/x.jpg'});
  assert.throws(() => normalizeMediaUpload({success:true,data:{mediaId:'m',url:'https://example.test/test.jpg'}}));
  assert.throws(() => normalizeMediaUpload({success:true,data:{media:{id:'m',secureUrl:'http://untrusted.test/x.jpg'}}}));
});
test('PDF download metadata must be application/pdf and nonempty', () => {
  requirePdfBlob(new Blob(['%PDF-'],{type:'application/pdf'}));
  assert.throws(() => requirePdfBlob(new Blob(['<html>'],{type:'text/html'})));
  assert.throws(() => requirePdfBlob(new Blob([],{type:'application/pdf'})));
});
