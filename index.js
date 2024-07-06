import express from 'express'; // express 모듈을 가져옴
import OpenAI from 'openai'; // OpenAI 모듈을 가져옴
import dotenv from 'dotenv'; // dotenv 모듈을 가져옴
import cors from 'cors'; // cors 모듈을 가져옴

dotenv.config(); // .env 파일에서 환경 변수를 로드함

const app = express(); // express 애플리케이션 생성
const PORT = process.env.PORT || 3000; // 포트를 환경 변수에서 가져오거나 기본값으로 3000을 사용

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // OpenAI 인스턴스를 API 키로 초기화

// CORS 설정
const corsOptions = {
  origin: [
    "https://port-0-test-back-lxlts66g89582f3b.sel5.cloudtype.app",
    "https://web-math-front-backup-lxlts66g89582f3b.sel5.cloudtype.app",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
  ], // 허용할 도메인들
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // 허용할 HTTP 메서드
  credentials: true, // 쿠키 허용 여부
  optionsSuccessStatus: 204, // 사전 요청에 대한 성공 상태 코드
};

app.use(cors(corsOptions)); // CORS 미들웨어 사용
app.use(express.json()); // JSON 요청 본문 파싱 미들웨어 사용

// Pre-flight 요청을 허용 (옵션 요청)
app.options('*', cors(corsOptions));

app.post('/solve-equation', async (req, res) => {
  const { equation } = req.body; // 요청 본문에서 방정식을 추출

  try {
    const assistant = await openai.beta.assistants.create({
      name: "수학 선생님",
      instructions: "당신은 개인 수학 선생님입니다. 코드를 써서 수학 질문에 답해주세요. 친절하게 답해주세요.",
      tools: [{ type: "code_interpreter" }], // 코드 인터프리터 도구 설정
      model: "gpt-4o" // 사용할 모델 설정
    });

    const thread = await openai.beta.threads.create(); // 새로운 쓰레드 생성

    // 사용자 메시지를 쓰레드에 추가
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: `저는 방정식을 풀어야해요 \`${equation}\`. 도와줄 수 있나요?`
      }
    );

    let responseText = ''; // 응답 텍스트를 저장할 변수

    // OpenAI 쓰레드 실행
    const run = openai.beta.threads.runs.stream(thread.id, {
      assistant_id: assistant.id
    });

    // 텍스트가 생성될 때마다 호출되는 이벤트 핸들러
    run.on('textCreated', (text) => {
      console.log('\nassistant > ', text);
      responseText += text; // 응답 텍스트에 추가
    });

    // 텍스트 델타가 발생할 때마다 호출되는 이벤트 핸들러
    run.on('textDelta', (textDelta) => {
      console.log(textDelta.value);
      responseText += textDelta.value; // 응답 텍스트에 추가
    });

    // 도구 호출이 생성될 때마다 호출되는 이벤트 핸들러
    run.on('toolCallCreated', (toolCall) => {
      console.log(`\nassistant > ${toolCall.type}\n\n`);
    });

    // 도구 호출 델타가 발생할 때마다 호출되는 이벤트 핸들러
    run.on('toolCallDelta', (toolCallDelta) => {
      if (toolCallDelta.type === 'code_interpreter') {
        if (toolCallDelta.code_interpreter.input) {
          console.log(toolCallDelta.code_interpreter.input);
          responseText += toolCallDelta.code_interpreter.input; // 응답 텍스트에 추가
        }
        if (toolCallDelta.code_interpreter.outputs) {
          console.log("\noutput >\n");
          toolCallDelta.code_interpreter.outputs.forEach(output => {
            if (output.type === "logs") {
              console.log(`\n${output.logs}\n`);
              responseText += output.logs; // 응답 텍스트에 추가
            }
          });
        }
      }
    });

    // 실행이 끝났을 때 호출되는 이벤트 핸들러
    run.on('end', () => {
      res.status(200).json({ response: responseText }); // 최종 응답을 클라이언트에게 전송
    });

  } catch (error) {
    console.error(error); // 에러 로그 출력
    res.status(500).send('An error occurred'); // 에러 응답 전송
  }
});

// 서버 시작
app.listen(PORT, function () {
  console.log(`${PORT}번 포트에서 서버가 실행 중입니다.`); // 서버 실행 메시지 출력
});
