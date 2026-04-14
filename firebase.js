const admin = require('firebase-admin');

// 시작할 때 바로 초기화
function initializeFirebase() {
  if (admin.apps.length) return admin.app();

  const rawKey = process.env.FIREBASE_KEY;
  
  if (!rawKey) {
    throw new Error('FIREBASE_KEY 환경변수가 없습니다. Railway Variables를 확인하세요.');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawKey);
  } catch (e) {
    throw new Error(`FIREBASE_KEY JSON 파싱 실패: ${e.message}\n값 앞부분: ${rawKey.slice(0, 50)}`);
  }

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
    return 'Cloud Firestore 데이터베이스가 아직 생성되지 않았습니다.';
  }
  if (message.includes('The query requires an index')) {
    return 'Firestore 복합 인덱스가 필요합니다.';
  }
  if (message.includes('Could not load the default credentials')) {
    return 'Firebase 인증 정보가 잘못되었습니다.';
  }
  if (message.includes('permission-denied') || message.includes('PERMISSION_DENIED')) {
    return 'Firestore 접근 권한이 없습니다.';
  }
  return `Firebase 오류: ${message || '알 수 없는 오류'}`;
}

module.exports = { initializeFirebase, getDb, serverTimestamp, formatFirebaseError };

// 봇 시작시 미리 초기화
try {
  initializeFirebase();
  console.log('✅ Firebase 초기화 성공');
} catch (e) {
  console.error('❌ Firebase 초기화 실패:', e.message);
}