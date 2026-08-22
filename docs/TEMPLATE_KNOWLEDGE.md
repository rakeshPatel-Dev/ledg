Templates API


Create Template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.create({
  name: 'order-confirmation',
  html: '<p>Name: {{{PRODUCT}}}</p><p>Total: {{{PRICE}}}</p>',
  variables: [
    {
      key: 'PRODUCT',
      type: 'string',
      fallbackValue: 'item',
    },
    {
      key: 'PRICE',
      type: 'number',
      fallbackValue: 20,
    },
  ],
});

// Or create and publish a template in one step
await resend.templates.create({ ... }).publish();



Get Template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.get('a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59');


Update Template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.update('a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59', {
  name: 'order-confirmation',
  html: '<p>Total: {{{PRICE}}}</p><p>Name: {{{PRODUCT}}}</p>',
});



Publish Template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.publish('a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59');
Duplicate Template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.duplicate('a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59');



Delete template
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.remove('a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59');



List Templates
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.templates.list({
  limit: 2,
  after: 'a0d32739-9c4e-4d5c-93cc-8e6a1b4f2a59',
});
