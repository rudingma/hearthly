import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

@InputType()
export class CreateHouseholdInput {
  @Field()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  // Platform idempotency key (see #119). We intentionally do NOT force UUID v4
  // here — the platform workstream will pick the canonical format (opaque
  // string is fine; UUID v4 is what `crypto.randomUUID()` produces; ULIDs or
  // shorter strings are also valid). Validate length + charset only.
  //
  // The charset constraint is also a log-injection safeguard: the service
  // embeds clientMutationId into logfmt log lines, and restricting to
  // [\w\-:.] prevents newlines or log-delimiter chars from splitting entries.
  @Field()
  @IsString()
  @Length(1, 128)
  @Matches(/^[\w\-:.]+$/, {
    message: 'clientMutationId must contain only [A-Za-z0-9_\\-:.] characters',
  })
  clientMutationId!: string;
}
