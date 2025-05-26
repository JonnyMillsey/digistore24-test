/*
  Firstly, due to alot of inconsistencies between code formatting
  I'd advise using formatting tools such as prettier and ESLint for quality issues
  to keep a uniform code standard, for use of;
  indentations, spacing, whitespace, use of single and double quotations
*/
import {Component, Injectable, Input, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

/*
  Please check the REVIEW_SUMMARY.md, as I have included some code snippets
  to show how we can approach this MessageService to make this more robust
  Let's have a call to discuss.
*/
@Injectable()
class MessageService {
  messages: Message[] = []; // consider an observable here to handle reactivity in following components, BehaviorSubject and then separately a public observable

  async all() { // missing return type ': Promise<void>'
      // expectation here for a try -> catch when dealing with async/await
      const res = await fetch('http://127.0.0.1:4010/messages') // consider using environments config, so we use this endpoint locally and true endpoints in other environments
        const data = await res.json();

        /*
          How are we handling error responses here from messages endpoint?
          Consider showing the user a friendly message
          say if we have an error response, then data.messages below will not be correct and cause errors on build
        */

      // instead of any property type - use api message schema type here (better option) / create your own model to be reused in the codebase
      this.messages = data.messages.map((message: any) => new Message(message.text, message.status)); // be careful with data.messages here, if response does not return messages object, then this will error
  }

  async add(message: Message) { // missing return type ': Promise<void>'
    this.messages.push(message);
  }
}

/*
  Instead of using a class here, we can explore setting up an interface 
  and as I have suggested below, moving the empty check into a separate utils function
  the reason for changing this setup; in it's current form, this may be considered overkill
  unless your expectation for future development may require this separation?

  I'd suggest a better approach would be to enhance the API contract, to include object models
  suggested from the contract, so we can be tightly coupled with the BE
*/
class Message {
  // these properties are in the constructor, no need for duplication
  text; // missing property type here, consider 'string'
  /* 
    status should relate to an enum or similar, if the expectation from api is to only return 'sent' status, 
    then let's create a codebase specific enum to reuse statuses like 'draft' 'pending' 'failed' and 'sent' 
  */ 
  status: string; 
  
  constructor(message: string, status: string) {
    this.text = message;
    this.status = status;
  }

  // I'd advise creating a reusable utils function 'isNullOrEmpty(value: string | null | undefined)' so this can be reused elsewhere in the project
  empty() { // add a return type here ': boolean', also the naming convention could be improved, possible suggestion 'isEmpty' / 'isMessageEmpty'
    return this.text === ''; // consider using .trim() on text, so we remove whitespace, this may be a better check !this.text?.trim()
  }
}

@Component({
  selector: 'app-massage', // incorrect naming convention here, I believe you mean to use 'app-message'
  standalone: true,
  template: `
    <div style="background-color: #fff;">  <!-- remove specific inline style here, better to use a class --> 
      <span class="bg-slate-400" class="block bg-slate-200 text-slate-500">#{{no}} - {{ message.status }}</span> <!-- duplicate class attribute here, also no need for span here, consider using 'div' so there is no need for span with block class -->
      <div class="p-2" [ngClass]="{'text-slate-500': message.status === 'draft'}"> <!-- please use 'Status' type for instance message.status === Status.DRAFT -->
        {{message.text}}
      </div>
    </div>
  `,
  imports: [
    NgClass
  ]
})
export class MessageComponent { // *export* is required so these components can be used by others
  @Input({ required: true }) message: any; // don't use 'any' property type here, better to use api schema, or create a model to be reused in the project
  @Input() no: any; // don't use 'any' property type here, use for instance 'string | number', consider a informative property name instead of 'no'
}

@Component({
  selector: 'app-chat',
  standalone: true,
  providers: [MessageService],
  imports: [
    NgForOf,
    MessageComponent
  ],
  template: `
    <div> <!-- no need for multiple empty div's here -->
      <div *ngFor="let message of messages; index as i;"> <!-- same here, consider adding for loop to selector below -->
        <app-massage [message]="message" [no]="i"></app-massage>
      </div>
    </div>
  `,
})
export class ChatComponent implements OnInit { // *export* is required so these components can be used by others
  messages: Message[] = []; // depending on the decision in the service, for using an observable of $messages, then this will need a small refactor
    constructor(
        private messageService: MessageService
    ) {

    }

    async ngOnInit() { // missing return type ': Promise<void>'
      // @ts-ignore -- no need for this, there is no error here
      await this.messageService.all(); // if no try -> catch in the service, consider putting one in here, I'd prefer try/catch in the service, to reduce component noise and centralize logic
      this.messages = this.messageService.messages;
    }
}

@Component({
  selector: 'app-create-message',
  standalone: true,
  providers: [MessageService],
  imports: [
    ReactiveFormsModule, // no need for this import, you are not using anything from this module currently
    FormsModule,
    MessageComponent,
    NgIf,
    NgClass,
  ],
  template: `
    <!-- 
      I don't believe draft app-message is best placed here, as this component is for create-message only
      and we should confine all chat messages to the chatComponent, this will help extending in future and styling of chatComponent
      Please check the REVIEW_SUMMARY.md, as I have included some code snippets to show how we can approach the draft message using an observable
      so this can be moved to createMessage component. Let's have a call to discuss. 
    -->
    <div *ngIf="! message.empty()"> <!-- remove whitespace between '! message...', possible improvement - we could use an isEmpty pipe here like !(message.text | isEmpty) -->
      <app-massage [message]="message" no="preview"></app-massage> <!-- update after correcting selector to 'app-message' -->
    </div>
    <form (ngSubmit)="onSubmit()">  <!-- as we are not using reactiveforms, best to set #form='ngForm' and add this to the onSubmit(form) call, this can then be utilised for the form validation and resetting form validations on success -->
      <label class="mt-4"> <!-- don't wrap the whole form content in a label, possible improvement would be to make this element a div, also a standard label does not include display block as standard, so the mt-4 will not work -->
        <div>Write Message</div> <!-- add label to this element instead -->
        <textarea class="block w-full" required name="text" [(ngModel)]="message.text"></textarea> <!-- textarea 'block' class is negated here, by default it renders on it's own line, we can remove this -->
        <!-- missing validation message for required textarea -->
      </label>

      <!-- please use 'Status' type for instance message.status === Status.PENDING -->
      <!-- 
        regarding classes - do we have a button class or reusable component styling in the project? we can either utilise mat-button color='primary' here, or check the rest of the project standard components
        additionally, as we are using tailwind CSS in this project, I'd suggest setting up common button base styles that can be reused here 
      -->
      <button type="submit"
          [disabled]="message.status === 'pending'"
          class="pointer bg-blue-400 py-2 px-4 mt-2 w-full"
          [ngClass]="{'bg-gray-400': message.status === 'pending'}" 
      >Send</button>  <!-- pointer class is not affective here (also no reference found in the project), tailwind adds 'cursor: pointer' by default to buttons -->
    </form>
  `,
  styles: ``
}) // the property 'styles' here isn't used, best to remove unless we add any content here
export class CreateMessageComponent { // *export* is required so these components can be used by others
  message: Message = new Message('', 'draft');
  private messageService: MessageService; // what is the need for extra declaration here, let's remove

  constructor(messageService: MessageService) { // if required to be private, set private here
    this.messageService = messageService; // no need to duplicate injection and property set
  }

  async onSubmit() { // missing return type ': Promise<void>'
    // missing check for empty message / valid form, consider an if condition - if empty message.text then return 
      this.message.status = 'pending'; // use Status enum and set this to 'Status.PENDING'

      /* 
        I'd suggest moving API calls to the messageService layer.
        Please check the REVIEW_SUMMARY.md, as I have included some code snippets
        to show how we can approach this MessageService to make this more robust
        Let's have a call to discuss. 
      */
      // expectation here for a try -> catch when dealing with async/await, if moved to messageService, we can deal with try/catch there
      const res = await fetch('http://127.0.0.1:4010/messages/send', {  // consider using environments config, so we use this endpoint locally and true endpoints in other environments
        method: 'GET', // why is this a GET, we are submitting here, conversation with BE is required as this should be a PUT / POST
        // missing headers e.g. Content-Type: 'application/json', why? because you are trying to include a request body, and the BE need to be aware of what content you are sending
        body: JSON.stringify({text: this.message.text}),
      });
      res.status === 204 ? this.message.status = 'sent' : this.message.status = 'failed'; // use Status.SENT and Status.FAILED
      await this.messageService.add(this.message);
      this.message = new Message('', 'draft');
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
      ChatComponent,
      CreateMessageComponent,
  ],
  template: `
    <!-- 
      due to responsiveness, I'd suggest some padding of the content, due to lower screen sizes, the content reaches the sides
      If this is going to be used as a widget item, then we can change the styles here slightly 
    -->
    <div class="max-w-md mx-auto"> 
      <h1 class="text-2xl my-8">{{ title }}</h1> <!-- unless necessary, we shouldn't add font sizing / margin classes to header elements, this negates the original styling for the project -->
      <app-chat></app-chat>
      <app-create-message></app-create-message>
    </div>
  `,
})
export class AppComponent {
  title = 'Chat';
}