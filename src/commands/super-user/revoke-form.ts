import {flow, pipe} from 'fp-ts/lib/function';
import * as tt from 'io-ts-types';
import * as t from 'io-ts';
import * as E from 'fp-ts/Either';
import {pageTemplate} from '../../templates';
import {html} from '../../types/html';
import * as O from 'fp-ts/Option';
import {User} from '../../types';
import {failureWithStatus} from '../../types/failure-with-status';
import {StatusCodes} from 'http-status-codes';
import {formatValidationErrors} from 'io-ts-reporters';
import {Form} from '../../types/form';

type ViewModel = {
  user: User;
  toBeRevoked: number;
};

const renderForm = (viewModel: ViewModel) =>
  pipe(
    html`
      <h1>Revoke super user</h1>
      <p>
        Are you sure you would like to revoke this members super-user
        privileges?
      </p>
      <dl>
        <dt>Member number</dt>
        <dd>${viewModel.toBeRevoked}</dd>
      </dl>
      <form action="#" method="post">
        <input
          type="hidden"
          name="memberNumber"
          value="${viewModel.toBeRevoked}"
        />
        <button type="submit">Confirm and send</button>
      </form>
    `,
    pageTemplate('Revoke super user', O.some(viewModel.user))
  );

const paramsCodec = t.strict({
  memberNumber: tt.IntFromString,
});

const constructForm: Form<ViewModel>['constructForm'] =
  input =>
  ({user}) =>
    pipe(
      input,
      paramsCodec.decode,
      E.mapLeft(
        flow(
          formatValidationErrors,
          failureWithStatus(
            'Parameters submitted to the form were invalid',
            StatusCodes.BAD_REQUEST
          )
        )
      ),
      E.map(params => ({
        user,
        toBeRevoked: params.memberNumber,
      }))
    );

export const revokeForm: Form<ViewModel> = {
  renderForm: renderForm,
  constructForm,
};
