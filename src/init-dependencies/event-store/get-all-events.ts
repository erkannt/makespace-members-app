import {pipe, flow} from 'fp-ts/lib/function';
import {StatusCodes} from 'http-status-codes';
import {formatValidationErrors} from 'io-ts-reporters';
import {Dependencies} from '../../dependencies';
import {DomainEvent} from '../../types';
import {failureWithStatus} from '../../types/failureWithStatus';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import * as tt from 'io-ts-types';
import * as t from 'io-ts';
import {QueryEventsDatabase} from './query-events-database';
import {EventsTable} from './events-table';

const reshapeRowToEvent = (row: EventsTable['rows'][number]) =>
  pipe(
    row.payload,
    tt.JsonFromString.decode,
    E.chain(tt.JsonRecord.decode),
    E.map(payload => ({
      type: row.event_type,
      ...payload,
    }))
  );

export const getAllEvents =
  (queryDatabase: QueryEventsDatabase): Dependencies['getAllEvents'] =>
  () =>
    pipe(
      queryDatabase([{sql: 'SELECT * FROM events;', args: {}}]),
      TE.chainEitherK(
        flow(
          EventsTable.decode,
          E.map(response => response.rows),
          E.chain(E.traverseArray(reshapeRowToEvent)),
          E.chain(t.readonlyArray(DomainEvent).decode),
          E.mapLeft(formatValidationErrors),
          E.mapLeft(
            failureWithStatus(
              'Failed to get events from DB',
              StatusCodes.INTERNAL_SERVER_ERROR
            )
          )
        )
      )
    );
