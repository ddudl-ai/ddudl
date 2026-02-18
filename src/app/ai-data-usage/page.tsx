export default function AIDataUsageAgreement() {
  return (
    <div className=&quot;container mx-auto px-4 py-8 max-w-4xl&quot;>
      <h1 className=&quot;text-3xl font-bold mb-6&quot;>AI 학습 데이터 제공 동의서</h1>
      
      <div className=&quot;text-sm text-gray-600 mb-6&quot;>
        <p>시행일자: 2025년 9월 1일</p>
        <p>버전: 2.1</p>
      </div>

      <div className=&quot;space-y-8 prose prose-gray max-w-none&quot;>
        <div className=&quot;bg-blue-50 border-l-4 border-blue-400 p-4 mb-6&quot;>
          <p className=&quot;text-sm text-blue-800&quot;>
            ddudl 플랫폼은 AI 기술을 활용하여 더 나은 서비스를 제공하고자 합니다. 
            여러분의 콘텐츠가 AI 학습에 활용될 수 있으며, 이는 서비스 품질 향상에 직접적으로 기여합니다.
          </p>
        </div>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>제1조 (수집 및 활용 항목)</h2>
          <ol className=&quot;list-decimal list-inside space-y-2&quot;>
            <li>게시물, 댓글 등 텍스트 콘텐츠</li>
            <li>업로드 이미지·영상 콘텐츠</li>
            <li>서비스 이용 패턴 및 상호작용 데이터</li>
          </ol>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>제2조 (활용 목적)</h2>
          <ol className=&quot;list-decimal list-inside space-y-2&quot;>
            <li>AI 언어모델 학습 및 성능 개선</li>
            <li>자동 모더레이션 시스템 개선</li>
            <li>콘텐츠 추천 알고리즘 개선</li>
            <li>서비스 품질 향상 연구·개발</li>
          </ol>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>제3조 (개인정보 보호)</h2>
          <ol className=&quot;list-decimal list-inside space-y-2&quot;>
            <li>AI 학습용 데이터는 개인 식별정보를 제거한 후 익명화 처리</li>
            <li>보안이 강화된 환경에서만 처리</li>
            <li>제3자 제공 시에도 익명화된 형태로만 제공</li>
          </ol>
          
          <div className=&quot;bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4&quot;>
            <p className=&quot;text-sm text-yellow-800&quot;>
              <strong>중요:</strong> 익명화 처리는 업계 표준 기술을 사용하여 개인 식별이 불가능하도록 
              처리되며, 원본 데이터와의 연결고리를 완전히 제거합니다.
            </p>
          </div>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>제4조 (동의 및 철회)</h2>
          <ol className=&quot;list-decimal list-inside space-y-2&quot;>
            <li>본 동의는 서비스 주요 기능 이용을 위한 필수 동의 사항입니다.</li>
            <li>이용자는 언제든지 계정 설정을 통해 향후 콘텐츠의 AI 학습 활용 중단을 요청할 수 있습니다.</li>
            <li>
              <span className=&quot;text-red-600 font-semibold&quot;>
                단, 이미 학습에 활용된 데이터는 기술적 특성상 삭제가 불가능합니다.
              </span>
            </li>
          </ol>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>AI 학습 활용의 이점</h2>
          <div className=&quot;bg-green-50 border-l-4 border-green-400 p-4&quot;>
            <ul className=&quot;list-disc list-inside space-y-2 text-green-800&quot;>
              <li>더 정확한 한국어 콘텐츠 이해 및 처리</li>
              <li>유해 콘텐츠 감지 정확도 향상</li>
              <li>개인화된 콘텐츠 추천 품질 개선</li>
              <li>전체적인 서비스 User 경험 향상</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>데이터 보안 약속</h2>
          <div className=&quot;bg-gray-50 p-4 rounded-lg&quot;>
            <p className=&quot;mb-3&quot;>ddudl 플랫폼은 다음과 같은 보안 조치를 약속합니다:</p>
            <ul className=&quot;list-check list-inside space-y-2&quot;>
              <li>✓ 최신 암호화 기술 적용</li>
              <li>✓ 접근 권한 엄격 관리</li>
              <li>✓ 정기적인 보안 감사 실시</li>
              <li>✓ 데이터 유출 시 즉시 통지</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className=&quot;text-xl font-semibold mb-3&quot;>문의처</h2>
          <p>AI 학습 데이터 활용과 관련한 문의사항은 아래로 연락 주시기 바랍니다:</p>
          <div className=&quot;bg-gray-100 p-3 rounded mt-2&quot;>
            <p className=&quot;text-sm&quot;>이메일: ai-privacy@ddudl.com</p>
            <p className=&quot;text-sm&quot;>전화: 1588-DDUDL (1588-3383)</p>
          </div>
        </section>

        <section className=&quot;border-t pt-6 mt-8&quot;>
          <div className=&quot;bg-blue-100 p-4 rounded-lg&quot;>
            <p className=&quot;text-sm text-blue-900&quot;>
              본 동의서에 동의하시면, 귀하의 콘텐츠가 ddudl 플랫폼의 AI 서비스 개선에 
              기여하게 됩니다. 이는 모든 User에게 더 나은 서비스를 제공하는 데 
              중요한 역할을 합니다.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}