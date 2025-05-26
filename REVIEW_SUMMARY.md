# Review Summary

This review identifies improvements in:

- **Code consistency**: Formatting and style (e.g., consistent spacing, quote usage, indentation)
- **Separation of concerns**: Clear boundaries between services and components
- **Type safety**: Replacing `any` with proper types and adding return types to functions
- **Semantic HTML and accessibility**: Improving element usage and structure for clarity and standards compliance
- **Maintainability**: Introduction of enums, constants, and reusable utility functions
- **Environment-based configuration**: Avoiding hard-coded URLs
- **Error handling**: Improving async/await usage with proper feedback and robustness

---

## Additional Notes

- Introduce a `Status` enum and a shared `isNullOrEmpty()` utility function to promote reuse and improve clarity.
- Structure the project by separating services, components, templates, utilities, and models into dedicated files/folders for better scalability and readability.
- Keep all API calls inside services to standardize communication and avoid tightly coupling external dependencies to the UI.
- Implement proper error handling using `try/catch` in async operations. Failing to do so can lead to unstable behavior and poor user experience.
- Provide user-facing feedback on both successful and failed operations to improve usability.

---

## Code Snippet

- As a potential enhancement, manage the `MessageService`'s state reactively using either a public getter observable (`messageService.messages`) or utilise Angular's Signals. See example code snippet below, I have chosen to show an observable-based approach instead of Signals here.
- Additionally to this, an `ApiClient wrapper` would benefit the project. This wrapper should be tightly coupled to the OpenAPI contract, ensuring type-safe request/response handling and consistency across the application. See example code snippet below.
- Below I have included a public getter observable (`messageService.draftMessage`), it would be cleaner and better for future enhancements to `move draft app-message` from `createMessageComponent` into `chatComponent`. For addtional advice on how we can approach this and what changes are needed in createMessageComponent, please reach out to me and I can go through this.

- **Example ApiClient Wrapper**
```ts
export class ApiClient {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${environment.apiBaseUrl}${path}`);

    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json() as Promise<T>;
  }

  async post<T, B = unknown>(path: string, body: B): Promise<T> {
    const res = await fetch(`${environment.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`POST ${path} failed`);
    if (res.status === 204) return; // no response body expected

    return res.json() as Promise<T>;
  }
}
```

- **Example Contract Types**
```ts
type GetMessagesResponse = paths["/messages"]["get"]["responses"][200]["content"]["application/json"];

// when contract is corrected to POST not GET
type SendMessageRequestBody =
  paths["/messages/send"]["post"]["requestBody"]["content"]["application/json"]; 
```

- **Example MessageService**
```ts
@Injectable({
  providedIn: 'root',
})
export class MessageService {
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private draftMessageSubject = new BehaviorSubject<Message | null>(null);

  get messages(): Observable<Message[]> {
    return this.messagesSubject.asObservable();
  }

  get draftMessage(): Observable<Message | null> {
    return this.draftMessageSubject.asObservable();
  }

  constructor(private api: ApiClient) {}

  async fetchMessages(): Promise<void> {
    try {
      const data = await this.api.get<GetMessagesResponse>('/messages');

      /*
        if contract GetMessagesResponse has optional messages object, 
        this will not fail on build but can fail in production 
        (check openapi.yaml review notes for clarification)
      */
      const messages: Message[] = data.messages.map(
        (m) => ({
            // validate fields here if they are optional in the contract
            text: m.text,
            status: m.status,
        })
      );

      this.messagesSubject.next(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // optionally notify user of unsuccessful GET in banner from here, or as part of the ApiClient
    }
  }

  updateDraft(message: Message): void {
    this.draftMessageSubject.next(message);
  }

  clearDraft(): void {
    this.draftMessageSubject.next(null);
  }

  addMessage(message: Message): void {
    const current = this.messagesSubject.getValue();
    this.messagesSubject.next([...current, message]);
    // utilising the draft observable here, and moving draft message from createMessageComponent -> chatComponent
    this.clearDraft(); 
  }

  async sendMessage(message: Message): Promise<void> {
    try {
      /*
        if contract SendMessageRequestBody has an optional 'text' property,
        this call will compile even if text is missing, but may fail at runtime
        depending on how the API handles empty or invalid payloads
        (see openapi.yaml review notes for further detail)
      */
      await this.api.post<void, SendMessageRequestBody>('/messages/send', {
        text: message.text,
      });

      message.status = MessageStatus.SENT;
      this.addMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
      // optionally notify user of unsuccessful POST in banner from here, or as part of the ApiClient

      message.status = MessageStatus.FAILED;
      this.addMessage(message);
    }
  }
}
```

---

## openapi.yaml review notes

- The OpenAPI-generated `openapi.d.ts` file reveals several issues in the schema:
- The `status` enum for messages only includes `"sent"`, which likely indicates a placeholder. Consider defining a proper enum (`draft`, `pending`, `sent`, `failed`) in `components.schemas`.
- All fields in the response (`messages`, `text`, and `status`) are optional, which prevents reliable type enforcement. Consider marking them as required in the schema.
- The `/messages/send` endpoint uses a `GET` method with a request body, which is not compliant with HTTP standards. Recommend changing this to a `POST`.
- No reusable components (`components.schemas`, etc.) are defined in the OpenAPI file, which limits reusability and makes the contract harder to evolve. Define and use a shared `Message` schema where possible.

---