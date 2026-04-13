const admin = require('firebase-admin');

function initializeFirebase() {
  if (admin.apps.length) return admin.app();
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  return admin.app();
}

function getDb() {
  initializeFirebase();
  return admin.firestore();
}

function serverTimestamp() {
  initializeFirebase();
  return admin.firestore.FieldValue.serverTimestamp();
}

function formatFirebaseError(error) {
  const message = error?.message || '';
  if (message.includes('5 NOT_FOUND')) {
    return 'Cloud Firestore 데이터베이스가 아직 생성되지 않았습니다. Firebase 콘솔에서 Firestore Database를 먼저 만들어주세요.';
  }
  if (message.includes('The query requires an index')) {
    return 'Firestore 복합 인덱스가 필요합니다. 콘솔에서 안내된 인덱스를 생성한 뒤 다시 시도해주세요.';
  }
  if (message.includes('Could not load the default credentials')) {
    return 'Firebase 인증 정보가 잘못되었습니다. 서비스 계정 키 파일 경로와 내용을 확인해주세요.';
  }
  if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
    return '현재 서비스 계정에 Firestore 접근 권한이 없습니다. Firebase IAM 권한을 확인해주세요.';
  }
  return `Firebase 오류: ${message || '알 수 없는 오류'}`;
}

module.exports = {
  initializeFirebase,
  getDb,
  serverTimestamp,
  formatFirebaseError,
};