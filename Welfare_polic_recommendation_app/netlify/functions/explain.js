/**
 * Netlify 서버리스 함수 — AI 맞춤 설명 생성 (방식 A)
 *
 * 프론트엔드가 { userProfile, service }를 POST하면
 * Claude API를 호출해 "왜 이 복지가 도움이 되는지" 2~3문장 설명을 반환한다.
 * API 키는 Netlify 환경변수 ANTHROPIC_API_KEY로 숨긴다.
 *
 * 실패 시에도 statusCode 200 + 빈 explanation을 돌려줘서
 * 프론트가 규칙 기반 설명으로 조용히 폴백하도록 한다.
 */

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ explanation: "" }) };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 200, body: JSON.stringify({ explanation: "" }) };
  }

  try {
    const { userProfile, service } = JSON.parse(event.body);
    const prompt = `당신은 복지 안내 도우미입니다. 아래 사용자에게 이 복지 서비스가 왜 도움이 되는지 쉽고 따뜻한 말로 2~3문장으로 설명하세요. 전문용어 없이, 어르신도 이해할 수 있게.

[사용자 상황]
${JSON.stringify(userProfile, null, 2)}

[복지 서비스]
이름: ${service.name}
요약: ${service.summary}
지원내용: ${service.support_amount}
소득기준: ${service.income_criteria}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { statusCode: 200, body: JSON.stringify({ explanation: text }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ explanation: "" }) };
  }
}
