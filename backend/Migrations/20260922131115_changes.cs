using Microsoft.EntityFrameworkCore.Migrations;
using System;

#nullable disable

namespace TalentHub.Migrations
{
    /// <inheritdoc />
    public partial class changes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Google Calendar columns and GoogleCalendarConnections
            // already exist in the database.
            // This migration synchronizes EF migration history
            // with the existing database schema.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally empty.
            // Existing Google Calendar database objects must not be deleted.
        }
    }
}